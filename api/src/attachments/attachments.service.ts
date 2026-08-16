import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileAttachment } from './entities/file-attachment.entity';
import type { IStorageService } from './storage.interface';
import { STORAGE_SERVICE } from './storage.interface';
import { TestResult } from '../test-results/entities/test-result.entity';
import { TestRun } from '../test-runs/entities/test-run.entity';
import { ProjectsService } from '../projects/projects.service';

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'application/zip',
  'application/x-zip-compressed',
  'video/mp4',
  'video/webm',
];

@Injectable()
export class AttachmentsService {
  constructor(
    @InjectRepository(FileAttachment)
    private readonly attachmentsRepo: Repository<FileAttachment>,
    @InjectRepository(TestResult)
    private readonly resultsRepo: Repository<TestResult>,
    @InjectRepository(TestRun)
    private readonly runsRepo: Repository<TestRun>,
    @Inject(STORAGE_SERVICE)
    private readonly storage: IStorageService,
    private readonly projectsService: ProjectsService,
  ) {}

  async upload(
    projectId: number,
    runId: number,
    resultId: number,
    file: Express.Multer.File,
    userId: number,
  ): Promise<FileAttachment> {
    await this.projectsService.findOne(projectId, userId);
    await this.assertResultInRun(resultId, runId, projectId);
    await this.assertRunNotCompleted(runId, projectId);

    if (file.size > MAX_FILE_BYTES) {
      throw new BadRequestException(`File exceeds the 20 MB limit.`);
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`File type "${file.mimetype}" is not allowed.`);
    }

    const { key } = await this.storage.save(file, `attachments/${resultId}`);

    const attachment = this.attachmentsRepo.create({
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      storageKey: key,
      testResultId: resultId,
      uploadedById: userId,
    });

    return this.attachmentsRepo.save(attachment);
  }

  async findOne(
    id: number,
    resultId: number,
    runId: number,
    projectId: number,
    userId: number,
  ): Promise<FileAttachment> {
    await this.projectsService.findOne(projectId, userId);
    await this.assertResultInRun(resultId, runId, projectId);

    const attachment = await this.attachmentsRepo.findOne({ where: { id, testResultId: resultId } });
    if (!attachment) throw new NotFoundException(`Attachment #${id} not found`);
    return attachment;
  }

  async remove(
    id: number,
    resultId: number,
    runId: number,
    projectId: number,
    userId: number,
  ): Promise<void> {
    await this.projectsService.findOne(projectId, userId);
    await this.assertRunNotCompleted(runId, projectId);
    const attachment = await this.findOne(id, resultId, runId, projectId, userId);
    await this.storage.delete(attachment.storageKey);
    await this.attachmentsRepo.delete(id);
  }

  resolveLocalPath(attachment: FileAttachment): string | null {
    return this.storage.resolveLocalPath(attachment.storageKey);
  }

  private async assertResultInRun(resultId: number, runId: number, projectId: number): Promise<void> {
    const result = await this.resultsRepo.findOne({
      where: { id: resultId, testRunId: runId },
      relations: { testRun: true },
    });
    if (!result || result.testRun?.projectId !== projectId) {
      throw new NotFoundException(`Result #${resultId} not found in this run`);
    }
  }

  private async assertRunNotCompleted(runId: number, projectId: number): Promise<void> {
    const run = await this.runsRepo.findOne({ where: { id: runId, projectId } });
    if (!run) throw new NotFoundException(`Run #${runId} not found`);
    if (run.status === 'completed') {
      throw new ForbiddenException('This test run is completed and locked. Attachments cannot be modified.');
    }
  }
}

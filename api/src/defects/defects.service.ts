import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectsService } from '../projects/projects.service';
import { TestResult } from '../test-results/entities/test-result.entity';
import { CreateDefectDto } from './dto/create-defect.dto';
import { UpdateDefectDto } from './dto/update-defect.dto';
import { Defect, DefectPriority, DefectSeverity, DefectSourceType, DefectStatus } from './entities/defect.entity';

@Injectable()
export class DefectsService {
  constructor(
    @InjectRepository(Defect)
    private readonly defectsRepository: Repository<Defect>,
    @InjectRepository(TestResult)
    private readonly testResultsRepository: Repository<TestResult>,
    private readonly projectsService: ProjectsService,
  ) {}

  async create(projectId: number, dto: CreateDefectDto, userId: number): Promise<Defect> {
    await this.projectsService.findOne(projectId, userId);

    const created = await this.defectsRepository.save(
      this.defectsRepository.create({
        title: dto.title.trim(),
        description: dto.description || null,
        status: dto.status || DefectStatus.OPEN,
        severity: dto.severity || DefectSeverity.MEDIUM,
        priority: dto.priority || DefectPriority.MEDIUM,
        expectedResult: dto.expectedResult || null,
        actualResult: dto.actualResult || null,
        environment: dto.environment || null,
        component: dto.component || null,
        sourceType: dto.sourceType || DefectSourceType.INTERNAL,
        externalKey: dto.externalKey || null,
        externalUrl: dto.externalUrl || null,
        projectId,
        createdById: userId,
      }),
    );

    return this.findOne(created.id, projectId, userId);
  }

  async findAll(projectId: number, userId: number): Promise<Defect[]> {
    await this.projectsService.findOne(projectId, userId);
    return this.defectsRepository.find({
      where: { projectId },
      relations: { results: true },
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(id: number, projectId: number, userId: number): Promise<Defect> {
    await this.projectsService.findOne(projectId, userId);
    const defect = await this.defectsRepository.findOne({
      where: { id, projectId },
      relations: { results: { testCase: true, testRun: true } },
    });

    if (!defect) {
      throw new NotFoundException(`Defect #${id} not found`);
    }

    return defect;
  }

  async update(id: number, projectId: number, dto: UpdateDefectDto, userId: number): Promise<Defect> {
    const defect = await this.findOne(id, projectId, userId);

    if (dto.title !== undefined) defect.title = dto.title.trim();
    if (dto.description !== undefined) defect.description = dto.description || null;
    if (dto.status !== undefined) defect.status = dto.status;
    if (dto.severity !== undefined) defect.severity = dto.severity;
    if (dto.priority !== undefined) defect.priority = dto.priority;
    if (dto.expectedResult !== undefined) defect.expectedResult = dto.expectedResult || null;
    if (dto.actualResult !== undefined) defect.actualResult = dto.actualResult || null;
    if (dto.environment !== undefined) defect.environment = dto.environment || null;
    if (dto.component !== undefined) defect.component = dto.component || null;
    if (dto.sourceType !== undefined) defect.sourceType = dto.sourceType;
    if (dto.externalKey !== undefined) defect.externalKey = dto.externalKey || null;
    if (dto.externalUrl !== undefined) defect.externalUrl = dto.externalUrl || null;

    await this.defectsRepository.save(defect);
    return this.findOne(id, projectId, userId);
  }

  async remove(id: number, projectId: number, userId: number): Promise<void> {
    await this.findOne(id, projectId, userId);
    await this.defectsRepository.delete(id);
  }

  async linkResult(id: number, projectId: number, resultId: number, userId: number): Promise<Defect> {
    const defect = await this.findOne(id, projectId, userId);
    const result = await this.findProjectScopedResult(resultId, projectId, userId);

    const linkedResults = defect.results ?? [];
    if (!linkedResults.some((item) => item.id === result.id)) {
      defect.results = [...linkedResults, result];
      await this.defectsRepository.save(defect);
    }

    return this.findOne(id, projectId, userId);
  }

  async unlinkResult(id: number, projectId: number, resultId: number, userId: number): Promise<Defect> {
    const defect = await this.findOne(id, projectId, userId);
    defect.results = (defect.results ?? []).filter((result) => result.id !== resultId);
    await this.defectsRepository.save(defect);
    return this.findOne(id, projectId, userId);
  }

  private async findProjectScopedResult(resultId: number, projectId: number, userId: number): Promise<TestResult> {
    await this.projectsService.findOne(projectId, userId);

    const result = await this.testResultsRepository.findOne({
      where: { id: resultId },
      relations: { testRun: true },
    });

    if (!result || result.testRunId == null || result.testRun?.projectId !== projectId) {
      throw new NotFoundException(`Result #${resultId} not found in this project`);
    }

    if (result.status === 'pending') {
      throw new BadRequestException('Only executed results can be linked to defects');
    }

    return result;
  }
}
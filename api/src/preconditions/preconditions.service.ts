import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Precondition } from './entities/precondition.entity';
import { CreatePreconditionDto } from './dto/create-precondition.dto';
import { UpdatePreconditionDto } from './dto/update-precondition.dto';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class PreconditionsService {
  constructor(
    @InjectRepository(Precondition)
    private readonly preconditionsRepository: Repository<Precondition>,
    private readonly projectsService: ProjectsService,
  ) {}

  async create(projectId: number, dto: CreatePreconditionDto, userId: number): Promise<Precondition> {
    await this.projectsService.findOne(projectId, userId);

    const key = await this.generateNextKey(projectId);
    await this.assertUniqueKey(projectId, key);

    const created = this.preconditionsRepository.create({
      key,
      name: dto.name.trim(),
      content: dto.content.trim(),
      projectId,
      createdById: userId,
    });

    return this.preconditionsRepository.save(created);
  }

  async findAll(projectId: number, userId: number): Promise<Precondition[]> {
    await this.projectsService.findOne(projectId, userId);
    return this.preconditionsRepository.find({
      where: { projectId },
      order: { key: 'ASC' },
    });
  }

  async findOne(id: number, projectId: number, userId: number): Promise<Precondition> {
    await this.projectsService.findOne(projectId, userId);
    const item = await this.preconditionsRepository.findOneBy({ id, projectId });
    if (!item) {
      throw new NotFoundException(`Precondition #${id} not found`);
    }
    return item;
  }

  async update(
    id: number,
    projectId: number,
    dto: UpdatePreconditionDto,
    userId: number,
  ): Promise<Precondition> {
    const existing = await this.findOne(id, projectId, userId);

    if (dto.name !== undefined) {
      existing.name = dto.name.trim();
    }

    if (dto.content !== undefined) {
      existing.content = dto.content.trim();
    }

    return this.preconditionsRepository.save(existing);
  }

  async remove(id: number, projectId: number, userId: number): Promise<void> {
    await this.findOne(id, projectId, userId);
    await this.preconditionsRepository.delete(id);
  }

  private async assertUniqueKey(projectId: number, key: string): Promise<void> {
    const duplicate = await this.preconditionsRepository.findOneBy({ projectId, key });
    if (duplicate) {
      throw new BadRequestException(`Precondition key ${key} already exists in this project`);
    }
  }

  private async generateNextKey(projectId: number): Promise<string> {
    const existing = await this.preconditionsRepository.find({
      where: { projectId },
      select: { key: true },
    });

    const used = new Set<number>();
    for (const item of existing) {
      const match = /^PC-(\d+)$/i.exec(item.key.trim());
      if (!match) continue;
      used.add(Number(match[1]));
    }

    let candidate = 1;
    while (used.has(candidate)) {
      candidate += 1;
    }

    return `PC-${candidate}`;
  }
}

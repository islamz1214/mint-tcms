import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProjectsService } from '../projects/projects.service';
import { TestCase } from '../test-cases/entities/test-case.entity';
import { CreateTestPlanDto } from './dto/create-test-plan.dto';
import { UpdateTestPlanDto } from './dto/update-test-plan.dto';
import { TestPlan } from './entities/test-plan.entity';

@Injectable()
export class TestPlansService {
  constructor(
    @InjectRepository(TestPlan)
    private readonly testPlansRepository: Repository<TestPlan>,
    @InjectRepository(TestCase)
    private readonly testCasesRepository: Repository<TestCase>,
    private readonly projectsService: ProjectsService,
  ) {}

  async create(projectId: number, dto: CreateTestPlanDto, userId: number): Promise<TestPlan> {
    await this.projectsService.findOne(projectId, userId);
    const scopedCases = await this.resolveScopedCases(projectId, dto.testCaseIds);

    const testPlan = this.testPlansRepository.create({
      name: dto.name.trim(),
      description: dto.description || null,
      cycleLabel: dto.cycleLabel?.trim() || null,
      type: dto.type,
      status: dto.status,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      projectId,
      createdById: userId,
      testCases: scopedCases,
    });

    const saved = await this.testPlansRepository.save(testPlan);
    return this.findOne(saved.id, projectId, userId);
  }

  async findAll(projectId: number, userId: number): Promise<TestPlan[]> {
    await this.projectsService.findOne(projectId, userId);
    return this.testPlansRepository.find({
      where: { projectId },
      relations: { testCases: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, projectId: number, userId: number): Promise<TestPlan> {
    await this.projectsService.findOne(projectId, userId);
    const testPlan = await this.testPlansRepository.findOne({
      where: { id, projectId },
      relations: { testCases: true },
    });

    if (!testPlan) {
      throw new NotFoundException(`Test plan #${id} not found`);
    }

    return testPlan;
  }

  async update(id: number, projectId: number, dto: UpdateTestPlanDto, userId: number): Promise<TestPlan> {
    const existing = await this.findOne(id, projectId, userId);

    if (dto.name !== undefined) existing.name = dto.name.trim();
    if (dto.description !== undefined) existing.description = dto.description || null;
    if (dto.cycleLabel !== undefined) existing.cycleLabel = dto.cycleLabel?.trim() || null;
    if (dto.type !== undefined) existing.type = dto.type;
    if (dto.status !== undefined) existing.status = dto.status;
    if (dto.startDate !== undefined) existing.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.endDate !== undefined) existing.endDate = dto.endDate ? new Date(dto.endDate) : null;

    if (dto.testCaseIds !== undefined) {
      existing.testCases = await this.resolveScopedCases(projectId, dto.testCaseIds);
    }

    await this.testPlansRepository.save(existing);
    return this.findOne(id, projectId, userId);
  }

  async remove(id: number, projectId: number, userId: number): Promise<void> {
    await this.findOne(id, projectId, userId);
    await this.testPlansRepository.delete(id);
  }

  private async resolveScopedCases(projectId: number, testCaseIds: number[]): Promise<TestCase[]> {
    if (testCaseIds.length === 0) {
      throw new BadRequestException('Select at least one test case for plan scope');
    }

    const uniqueIds = [...new Set(testCaseIds)];
    const testCases = await this.testCasesRepository.find({
      where: {
        id: In(uniqueIds),
        projectId,
      },
    });

    if (testCases.length !== uniqueIds.length) {
      throw new BadRequestException('One or more selected test cases do not belong to this project');
    }

    return testCases;
  }
}

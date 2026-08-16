import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  Requirement,
  RequirementPriority,
  RequirementStatus,
} from './entities/requirement.entity';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import { ProjectsService } from '../projects/projects.service';
import { TestCase } from '../test-cases/entities/test-case.entity';
import { TestResult, TestResultStatus } from '../test-results/entities/test-result.entity';

export type RequirementCoverageStatus =
  | 'not_covered'
  | 'covered'
  | 'executed_pass'
  | 'executed_fail'
  | 'mixed';

export type RequirementView = Requirement & {
  linkedTestCasesCount: number;
  coverageStatus: RequirementCoverageStatus;
  latestExecutionAt: Date | null;
  passedCount: number;
  failedCount: number;
  blockedCount: number;
  pendingCount: number;
  skippedCount: number;
};

@Injectable()
export class RequirementsService {
  constructor(
    @InjectRepository(Requirement)
    private readonly requirementsRepository: Repository<Requirement>,
    @InjectRepository(TestCase)
    private readonly testCasesRepository: Repository<TestCase>,
    @InjectRepository(TestResult)
    private readonly testResultsRepository: Repository<TestResult>,
    private readonly projectsService: ProjectsService,
  ) {}

  async create(projectId: number, dto: CreateRequirementDto, userId: number): Promise<RequirementView> {
    await this.projectsService.findOne(projectId, userId);

    const key = dto.key?.trim().toUpperCase() || (await this.generateRequirementKey(projectId));
    await this.ensureUniqueKey(projectId, key);

    const created = await this.requirementsRepository.save(
      this.requirementsRepository.create({
        key,
        title: dto.title.trim(),
        description: dto.description || null,
        status: dto.status || RequirementStatus.DRAFT,
        priority: dto.priority || RequirementPriority.MEDIUM,
        externalSystem: dto.externalSystem || null,
        externalId: dto.externalId || null,
        externalUrl: dto.externalUrl || null,
        projectId,
        ownerId: userId,
      }),
    );

    const requirement = await this.findOne(created.id, projectId, userId);
    return (await this.enrichRequirementsWithCoverage([requirement]))[0];
  }

  async findAll(projectId: number, userId: number): Promise<RequirementView[]> {
    await this.projectsService.findOne(projectId, userId);

    const requirements = await this.requirementsRepository.find({
      where: { projectId },
      relations: { testCases: true },
      order: { updatedAt: 'DESC' },
    });

    return this.enrichRequirementsWithCoverage(requirements);
  }

  async findMatrix(projectId: number, userId: number): Promise<RequirementView[]> {
    return this.findAll(projectId, userId);
  }

  async findOne(id: number, projectId: number, userId: number): Promise<Requirement> {
    await this.projectsService.findOne(projectId, userId);
    const requirement = await this.requirementsRepository.findOne({
      where: { id, projectId },
      relations: { testCases: true },
    });

    if (!requirement) {
      throw new NotFoundException(`Requirement #${id} not found`);
    }

    return requirement;
  }

  async update(
    id: number,
    projectId: number,
    dto: UpdateRequirementDto,
    userId: number,
  ): Promise<RequirementView> {
    const requirement = await this.findOne(id, projectId, userId);

    if (dto.key && dto.key.trim().toUpperCase() !== requirement.key) {
      const nextKey = dto.key.trim().toUpperCase();
      await this.ensureUniqueKey(projectId, nextKey);
      requirement.key = nextKey;
    }

    if (dto.title !== undefined) requirement.title = dto.title.trim();
    if (dto.description !== undefined) requirement.description = dto.description || null;
    if (dto.status !== undefined) requirement.status = dto.status;
    if (dto.priority !== undefined) requirement.priority = dto.priority;
    if (dto.externalSystem !== undefined) requirement.externalSystem = dto.externalSystem || null;
    if (dto.externalId !== undefined) requirement.externalId = dto.externalId || null;
    if (dto.externalUrl !== undefined) requirement.externalUrl = dto.externalUrl || null;

    const saved = await this.requirementsRepository.save(requirement);
    return (await this.enrichRequirementsWithCoverage([saved]))[0];
  }

  async remove(id: number, projectId: number, userId: number): Promise<void> {
    await this.findOne(id, projectId, userId);
    await this.requirementsRepository.delete(id);
  }

  async linkTestCase(
    id: number,
    projectId: number,
    testCaseId: number,
    userId: number,
  ): Promise<RequirementView> {
    const requirement = await this.findOne(id, projectId, userId);
    const testCase = await this.testCasesRepository.findOneBy({ id: testCaseId, projectId });

    if (!testCase) {
      throw new NotFoundException(`Test case #${testCaseId} not found`);
    }

    const linked = requirement.testCases ?? [];
    if (!linked.some((item) => item.id === testCase.id)) {
      requirement.testCases = [...linked, testCase];
      await this.requirementsRepository.save(requirement);
    }

    const refreshed = await this.findOne(id, projectId, userId);
    return (await this.enrichRequirementsWithCoverage([refreshed]))[0];
  }

  async unlinkTestCase(
    id: number,
    projectId: number,
    testCaseId: number,
    userId: number,
  ): Promise<RequirementView> {
    const requirement = await this.findOne(id, projectId, userId);

    requirement.testCases = (requirement.testCases ?? []).filter((testCase) => testCase.id !== testCaseId);
    await this.requirementsRepository.save(requirement);

    const refreshed = await this.findOne(id, projectId, userId);
    return (await this.enrichRequirementsWithCoverage([refreshed]))[0];
  }

  private async ensureUniqueKey(projectId: number, key: string): Promise<void> {
    const existing = await this.requirementsRepository.findOneBy({ projectId, key });
    if (existing) {
      throw new BadRequestException(`Requirement key ${key} already exists in this project`);
    }
  }

  private async generateRequirementKey(projectId: number): Promise<string> {
    const count = await this.requirementsRepository.count({ where: { projectId } });
    return `REQ-${count + 1}`;
  }

  private async buildLatestResultMap(requirements: Requirement[]): Promise<Map<number, TestResult>> {
    const testCaseIds = [...new Set(requirements.flatMap((item) => (item.testCases ?? []).map((tc) => tc.id)))];

    if (testCaseIds.length === 0) {
      return new Map();
    }

    const results = await this.testResultsRepository.find({
      where: { testCaseId: In(testCaseIds) },
      order: { updatedAt: 'DESC' },
    });

    const latestByCase = new Map<number, TestResult>();
    for (const result of results) {
      if (!latestByCase.has(result.testCaseId)) {
        latestByCase.set(result.testCaseId, result);
      }
    }

    return latestByCase;
  }

  private async enrichRequirementsWithCoverage(requirements: Requirement[]): Promise<RequirementView[]> {
    const latestByCase = await this.buildLatestResultMap(requirements);

    return requirements.map((requirement) => {
      const linkedCases = requirement.testCases ?? [];
      const linkedTestCasesCount = linkedCases.length;
      const latestResults = linkedCases
        .map((testCase) => latestByCase.get(testCase.id))
        .filter((value): value is TestResult => Boolean(value));

      const statusCounts = {
        passedCount: latestResults.filter((result) => result.status === TestResultStatus.PASSED).length,
        failedCount: latestResults.filter((result) => result.status === TestResultStatus.FAILED).length,
        blockedCount: latestResults.filter((result) => result.status === TestResultStatus.BLOCKED).length,
        pendingCount: latestResults.filter((result) => result.status === TestResultStatus.PENDING).length,
        skippedCount: latestResults.filter((result) => result.status === TestResultStatus.SKIPPED).length,
      };

      let coverageStatus: RequirementCoverageStatus;
      if (linkedTestCasesCount === 0) {
        coverageStatus = 'not_covered';
      } else if (latestResults.length === 0) {
        coverageStatus = 'covered';
      } else if (statusCounts.failedCount > 0) {
        coverageStatus = 'executed_fail';
      } else if (
        statusCounts.passedCount === linkedTestCasesCount &&
        statusCounts.blockedCount === 0 &&
        statusCounts.pendingCount === 0 &&
        statusCounts.skippedCount === 0
      ) {
        coverageStatus = 'executed_pass';
      } else {
        coverageStatus = 'mixed';
      }

      const latestExecutionAt = latestResults.length
        ? latestResults.reduce((latest, current) =>
            current.updatedAt > latest ? current.updatedAt : latest,
          latestResults[0].updatedAt)
        : null;

      return {
        ...requirement,
        linkedTestCasesCount,
        coverageStatus,
        latestExecutionAt,
        ...statusCounts,
      };
    });
  }
}

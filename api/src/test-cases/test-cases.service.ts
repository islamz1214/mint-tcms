import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TestCase } from './entities/test-case.entity';
import { CreateTestCaseDto } from './dto/create-test-case.dto';
import { UpdateTestCaseDto } from './dto/update-test-case.dto';
import { BulkAssignSuiteDto } from './dto/bulk-assign-suite.dto';
import { ProjectsService } from '../projects/projects.service';
import { TestSuite } from '../test-suites/entities/test-suite.entity';
import { ImportTestCasesResponseDto } from './dto/import-test-cases-response.dto';
import { mapCsvRows } from './test-case-csv';
import { TestCasePriority, TestCaseStatus } from './entities/test-case.entity';
import { parseZephyrXml, type ZephyrStepInput } from './zephyr-xml';
import { TestCaseRevision } from './entities/test-case-revision.entity';
import { Precondition } from '../preconditions/entities/precondition.entity';

export interface TestCaseListQuery {
  limit?: number;
  offset?: number;
  q?: string;
  suiteIds?: number[];
  unassigned?: boolean;
}

export interface TestCaseListResult {
  total: number;
  items: TestCase[];
}

@Injectable()
export class TestCasesService {
  constructor(
    @InjectRepository(TestCase)
    private readonly testCasesRepository: Repository<TestCase>,
    @InjectRepository(TestSuite)
    private readonly testSuitesRepository: Repository<TestSuite>,
    @InjectRepository(TestCaseRevision)
    private readonly testCaseRevisionsRepository: Repository<TestCaseRevision>,
    @InjectRepository(Precondition)
    private readonly preconditionsRepository: Repository<Precondition>,
    private readonly projectsService: ProjectsService,
  ) {}

  async create(projectId: number, dto: CreateTestCaseDto, userId: number): Promise<TestCase> {
    // verify project exists and belongs to user
    const project = await this.projectsService.findOne(projectId, userId);
    const projectKey = this.resolveProjectKey(project.key, project.id);
    const sequence = await this.getNextTestCaseSequence(projectId, projectKey);
    const key = `${projectKey}-${sequence}`;
    const preconditionId = await this.resolvePreconditionId(projectId, dto.preconditionId);
    const testCase = this.testCasesRepository.create({
      ...dto,
      key,
      projectId,
      createdById: userId,
      preconditionId,
    });
    const saved = await this.testCasesRepository.save(testCase);
    await this.createRevisionSnapshot(saved, userId);
    return this.findOne(saved.id, projectId, userId);
  }

  async importCsv(
    projectId: number,
    csvContent: string,
    userId: number,
  ): Promise<ImportTestCasesResponseDto> {
    const project = await this.projectsService.findOne(projectId, userId);
    const projectKey = this.resolveProjectKey(project.key, project.id);

    const rows = mapCsvRows(csvContent);
    if (rows.length === 0) {
      throw new BadRequestException('The CSV file is empty or contains no importable rows');
    }

    const existingSuites = await this.testSuitesRepository.find({ where: { projectId } });
    const suiteByKey = new Map<string, TestSuite>();

    for (const suite of existingSuites) {
      suiteByKey.set(this.suiteKey(suite.parentId ?? null, suite.name), suite);
    }

    let createdSuiteCount = 0;

    const ensureSuitePath = async (fullPath: string | undefined): Promise<number | null> => {
      if (!fullPath?.trim()) return null;

      const segments = fullPath
        .split('/')
        .map((segment) => segment.trim())
        .filter(Boolean);

      if (segments.length === 0) return null;

      let parentId: number | null = null;

      for (const segment of segments) {
        const key = this.suiteKey(parentId, segment);
        let suite = suiteByKey.get(key);
        if (!suite) {
          suite = await this.testSuitesRepository.save(
            this.testSuitesRepository.create({
              name: segment,
              projectId,
              parentId,
            }),
          );
          suiteByKey.set(key, suite);
          createdSuiteCount += 1;
        }
        parentId = suite.id;
      }

      return parentId;
    };

    const warnings: string[] = [];
    const toCreate: CreateTestCaseDto[] = [];

    // Extract and create all unique suite paths first
    const uniqueSuitePaths = [...new Set(rows.map((r) => r.values.suite).filter(Boolean))].sort(
      (left, right) => (left?.split('/').length ?? 0) - (right?.split('/').length ?? 0),
    );

    for (const suitePath of uniqueSuitePaths) {
      if (suitePath) {
        await ensureSuitePath(suitePath);
      }
    }

    // Now process test cases with suites already created
    for (const { rowNumber, values } of rows) {
      const title = values.title?.trim() ?? '';
      if (!title) {
        warnings.push(`Row ${rowNumber}: missing title, skipped.`);
        continue;
      }

      if (title.length < 3) {
        warnings.push(`Row ${rowNumber}: title must be at least 3 characters, skipped.`);
        continue;
      }

      const dto: CreateTestCaseDto = {
        title,
        description: values.description || undefined,
        steps: values.steps || undefined,
        expectedResult: values.expectedResult || undefined,
        status: this.mapStatus(values.status, rowNumber, warnings),
        priority: this.mapPriority(values.priority, rowNumber, warnings),
      };

      const suitePath = values.suite?.trim();
      if (suitePath) {
        const suiteId = await ensureSuitePath(suitePath);
        if (suiteId) {
          dto.testSuiteId = suiteId;
        }
      }

      toCreate.push(dto);
    }

    if (toCreate.length === 0) {
      throw new BadRequestException('No valid test cases were found in the CSV file');
    }

    const nextSequence = await this.getNextTestCaseSequence(projectId, projectKey);
    const entities = toCreate.map((dto, index) =>
      this.testCasesRepository.create({
        ...dto,
        key: `${projectKey}-${nextSequence + index}`,
        projectId,
        createdById: userId,
      }),
    );
    await this.testCasesRepository.save(entities);

    return {
      createdCount: entities.length,
      skippedCount: rows.length - entities.length,
      createdSuiteCount,
      warnings,
    };
  }

  async importZephyrXml(
    projectId: number,
    xmlContent: string,
    userId: number,
  ): Promise<ImportTestCasesResponseDto> {
    const project = await this.projectsService.findOne(projectId, userId);
    const projectKey = this.resolveProjectKey(project.key, project.id);

    const parsed = parseZephyrXml(xmlContent);
    const existingSuites = await this.testSuitesRepository.find({ where: { projectId } });
    const suiteByKey = new Map<string, TestSuite>();

    for (const suite of existingSuites) {
      suiteByKey.set(this.suiteKey(suite.parentId ?? null, suite.name), suite);
    }

    let createdSuiteCount = 0;

    const ensureSuitePath = async (fullPath: string | undefined): Promise<number | null> => {
      if (!fullPath?.trim()) return null;

      const segments = fullPath
        .split('/')
        .map((segment) => segment.trim())
        .filter(Boolean);

      if (segments.length === 0) return null;

      let parentId: number | null = null;

      for (const segment of segments) {
        const key = this.suiteKey(parentId, segment);
        let suite = suiteByKey.get(key);
        if (!suite) {
          suite = await this.testSuitesRepository.save(
            this.testSuitesRepository.create({
              name: segment,
              projectId,
              parentId,
            }),
          );
          suiteByKey.set(key, suite);
          createdSuiteCount += 1;
        }
        parentId = suite.id;
      }

      return parentId;
    };

    const warnings: string[] = [];

    const uniqueFolderPaths = [...new Set(parsed.folderPaths.filter(Boolean))].sort(
      (left, right) => left.split('/').length - right.split('/').length,
    );

    for (const folderPath of uniqueFolderPaths) {
      await ensureSuitePath(folderPath);
    }

    const toCreate: CreateTestCaseDto[] = [];

    for (const [index, testCase] of parsed.testCases.entries()) {
      const rowNumber = index + 1;
      const title = testCase.title.trim();

      if (!title) {
        warnings.push(`Test case ${rowNumber}: missing title, skipped.`);
        continue;
      }

      if (title.length < 3) {
        warnings.push(`Test case ${rowNumber}: title must be at least 3 characters, skipped.`);
        continue;
      }

      const dto: CreateTestCaseDto = {
        title,
        description: testCase.description || undefined,
        status: this.mapZephyrStatus(testCase.status, rowNumber, warnings),
        priority: this.mapZephyrPriority(testCase.priority, rowNumber, warnings),
      };

      const serializedSteps = this.serializeStructuredSteps(testCase.steps);
      dto.steps = serializedSteps.steps;
      dto.expectedResult = serializedSteps.expectedResult;

      const suiteId = await ensureSuitePath(testCase.folderPath);
      if (suiteId) {
        dto.testSuiteId = suiteId;
      }

      toCreate.push(dto);
    }

    if (toCreate.length === 0) {
      throw new BadRequestException('No valid test cases were found in the Zephyr XML file');
    }

    const nextSequence = await this.getNextTestCaseSequence(projectId, projectKey);
    const entities = toCreate.map((dto, index) =>
      this.testCasesRepository.create({
        ...dto,
        key: `${projectKey}-${nextSequence + index}`,
        projectId,
        createdById: userId,
      }),
    );
    await this.testCasesRepository.save(entities);

    return {
      createdCount: entities.length,
      skippedCount: parsed.testCases.length - entities.length,
      createdSuiteCount,
      warnings,
    };
  }

  async findAll(
    projectId: number,
    userId: number,
    query: TestCaseListQuery = {},
  ): Promise<TestCase[] | TestCaseListResult> {
    await this.projectsService.findOne(projectId, userId);

    const base = this.testCasesRepository
      .createQueryBuilder('tc')
      .leftJoinAndSelect('tc.preconditionRef', 'preconditionRef')
      .where('tc.projectId = :projectId', { projectId });

    if (query.q && query.q.trim()) {
      const q = `%${query.q.trim()}%`;
      base.andWhere(
        '(LOWER(tc.title) LIKE LOWER(:q) OR LOWER(COALESCE(tc.description, \'\')) LIKE LOWER(:q))',
        { q },
      );
    }

    if (query.suiteIds && query.suiteIds.length > 0) {
      base.andWhere('tc.testSuiteId IN (:...suiteIds)', { suiteIds: query.suiteIds });
    }

    if (query.unassigned) {
      base.andWhere('tc.testSuiteId IS NULL');
    }

    base.orderBy('tc.id', 'ASC');

    // Without a limit, preserve the original behaviour of returning every case.
    if (query.limit === undefined) {
      return base.getMany();
    }

    const total = await base.clone().getCount();
    const items = await base
      .skip(query.offset ?? 0)
      .take(query.limit)
      .getMany();

    return { total, items };
  }

  async exportCsv(projectId: number, userId: number): Promise<string> {
    await this.projectsService.findOne(projectId, userId);

    const testCases = await this.testCasesRepository.find({
      where: { projectId },
      order: { id: 'ASC' },
    });

    const suiteIds = [...new Set(testCases.map((testCase) => testCase.testSuiteId).filter((id): id is number => id !== null))];
    const suites = suiteIds.length
      ? await this.testSuitesRepository.find({ where: { id: In(suiteIds), projectId } })
      : [];
    const suiteNameById = new Map<number, string>(suites.map((suite) => [suite.id, suite.name]));

    const headers = ['title', 'description', 'steps', 'expectedResult', 'status', 'priority', 'suite'];
    const rows = testCases.map((testCase) => [
      testCase.title ?? '',
      testCase.description ?? '',
      testCase.steps ?? '',
      testCase.expectedResult ?? '',
      testCase.status ?? '',
      testCase.priority ?? '',
      testCase.testSuiteId ? suiteNameById.get(testCase.testSuiteId) ?? '' : '',
    ]);

    const allRows = [headers, ...rows];
    return allRows.map((row) => row.map((cell) => this.escapeCsvCell(cell)).join(',')).join('\n');
  }

  async findOne(id: number, projectId: number, userId: number): Promise<TestCase> {
    await this.projectsService.findOne(projectId, userId);
    const testCase = await this.testCasesRepository.findOne({
      where: { id, projectId },
      relations: { preconditionRef: true },
    });
    if (!testCase) throw new NotFoundException(`Test case #${id} not found`);
    return testCase;
  }

  async findRevisions(id: number, projectId: number, userId: number): Promise<TestCaseRevision[]> {
    await this.findOne(id, projectId, userId);
    return this.testCaseRevisionsRepository.find({
      where: { testCaseId: id },
      order: { version: 'DESC' },
      relations: { changedBy: true },
    });
  }

  async update(id: number, projectId: number, dto: UpdateTestCaseDto, userId: number): Promise<TestCase> {
    const existing = await this.findOne(id, projectId, userId);
    const preconditionId =
      dto.preconditionId === undefined
        ? existing.preconditionId
        : await this.resolvePreconditionId(projectId, dto.preconditionId);
    const updated = this.testCasesRepository.create({
      ...existing,
      ...dto,
      preconditionId,
    });

    if (!this.hasTrackedChanges(existing, updated)) {
      return existing;
    }

    const saved = await this.testCasesRepository.save(updated);
    await this.createRevisionSnapshot(saved, userId);
    return this.findOne(saved.id, projectId, userId);
  }

  async bulkAssignSuite(
    projectId: number,
    dto: BulkAssignSuiteDto,
    userId: number,
  ): Promise<{ updatedCount: number; updatedIds: number[] }> {
    await this.projectsService.findOne(projectId, userId);

    const testCaseIds = [...new Set(dto.testCaseIds)];
    if (testCaseIds.length === 0) {
      throw new BadRequestException('testCaseIds cannot be empty');
    }

    const targetSuiteId = dto.testSuiteId ?? null;

    if (targetSuiteId !== null) {
      const suite = await this.testSuitesRepository.findOneBy({
        id: targetSuiteId,
        projectId,
      });
      if (!suite) {
        throw new BadRequestException('Target test suite not found in this project');
      }
    }

    const testCases = await this.testCasesRepository.find({
      where: { projectId, id: In(testCaseIds) },
      relations: { preconditionRef: true },
    });

    if (testCases.length !== testCaseIds.length) {
      throw new BadRequestException('Some test cases were not found in this project');
    }

    const updatedIds: number[] = [];
    for (const testCase of testCases) {
      if ((testCase.testSuiteId ?? null) === targetSuiteId) {
        continue;
      }

      const updated = this.testCasesRepository.create({
        ...testCase,
        testSuiteId: targetSuiteId,
      });

      await this.testCasesRepository.save(updated);
      await this.createRevisionSnapshot(updated, userId);
      updatedIds.push(updated.id);
    }

    return {
      updatedCount: updatedIds.length,
      updatedIds,
    };
  }

  async restoreRevision(
    id: number,
    projectId: number,
    revisionId: number,
    userId: number,
  ): Promise<TestCase> {
    const existing = await this.findOne(id, projectId, userId);
    const revision = await this.testCaseRevisionsRepository.findOneBy({
      id: revisionId,
      testCaseId: id,
    });

    if (!revision) {
      throw new NotFoundException(`Revision #${revisionId} not found for test case #${id}`);
    }

    const restored = this.testCasesRepository.create({
      ...existing,
      title: revision.title,
      description: revision.description,
      precondition: revision.precondition,
      preconditionId: revision.preconditionId,
      steps: revision.steps,
      expectedResult: revision.expectedResult,
      status: revision.status,
      priority: revision.priority,
      testSuiteId: revision.testSuiteId,
    });

    if (!this.hasTrackedChanges(existing, restored)) {
      throw new BadRequestException('Selected revision is already the current version');
    }

    const saved = await this.testCasesRepository.save(restored);
    await this.createRevisionSnapshot(saved, userId);
    return this.findOne(saved.id, projectId, userId);
  }

  async remove(id: number, projectId: number, userId: number): Promise<void> {
    await this.findOne(id, projectId, userId);
    await this.testCasesRepository.delete(id);
  }

  private mapStatus(
    rawValue: string | undefined,
    rowNumber: number,
    warnings: string[],
  ): TestCaseStatus {
    const value = rawValue?.trim().toLowerCase();
    if (!value) return TestCaseStatus.DRAFT;
    if (value === TestCaseStatus.ACTIVE) return TestCaseStatus.ACTIVE;
    if (value === TestCaseStatus.DRAFT) return TestCaseStatus.DRAFT;
    if (value === TestCaseStatus.ARCHIVED) return TestCaseStatus.ARCHIVED;

    warnings.push(`Row ${rowNumber}: unsupported status "${rawValue}", defaulted to draft.`);
    return TestCaseStatus.DRAFT;
  }

  private mapPriority(
    rawValue: string | undefined,
    rowNumber: number,
    warnings: string[],
  ): TestCasePriority {
    const value = rawValue?.trim().toLowerCase();
    if (!value) return TestCasePriority.MEDIUM;
    if (value === TestCasePriority.LOW) return TestCasePriority.LOW;
    if (value === TestCasePriority.MEDIUM) return TestCasePriority.MEDIUM;
    if (value === TestCasePriority.HIGH) return TestCasePriority.HIGH;

    warnings.push(`Row ${rowNumber}: unsupported priority "${rawValue}", defaulted to medium.`);
    return TestCasePriority.MEDIUM;
  }

  private mapZephyrStatus(
    rawValue: string | undefined,
    rowNumber: number,
    warnings: string[],
  ): TestCaseStatus {
    const value = rawValue?.trim().toLowerCase();
    if (!value) return TestCaseStatus.DRAFT;
    if (value === 'approved' || value === 'active') return TestCaseStatus.ACTIVE;
    if (value === 'draft') return TestCaseStatus.DRAFT;
    if (value === 'archived') return TestCaseStatus.ARCHIVED;

    warnings.push(`Test case ${rowNumber}: unsupported Zephyr status "${rawValue}", defaulted to draft.`);
    return TestCaseStatus.DRAFT;
  }

  private mapZephyrPriority(
    rawValue: string | undefined,
    rowNumber: number,
    warnings: string[],
  ): TestCasePriority {
    const value = rawValue?.trim().toLowerCase();
    if (!value) return TestCasePriority.MEDIUM;
    if (value === 'high' || value === 'highest') return TestCasePriority.HIGH;
    if (value === 'normal' || value === 'medium') return TestCasePriority.MEDIUM;
    if (value === 'low' || value === 'lowest') return TestCasePriority.LOW;

    warnings.push(`Test case ${rowNumber}: unsupported Zephyr priority "${rawValue}", defaulted to medium.`);
    return TestCasePriority.MEDIUM;
  }

  private serializeStructuredSteps(
    steps: ZephyrStepInput[],
  ): { steps?: string; expectedResult?: string } {
    if (steps.length === 0) {
      return {};
    }

    const hasAnyTestData = steps.some((step) => step.testData.trim().length > 0);
    const serializedSteps = steps
      .map((step, index) => {
        const detailLines = [
          step.action ? `Action: ${step.action}` : 'Action: (not provided)',
          step.expectedResult
            ? `Expected Result: ${step.expectedResult}`
            : 'Expected Result: (not provided)',
        ];

        if (hasAnyTestData) {
          detailLines.splice(
            1,
            0,
            step.testData ? `Test Data: ${step.testData}` : 'Test Data: (not provided)',
          );
        }

        return `Step ${index + 1}\n${detailLines.join('\n')}`;
      })
      .join('\n\n');

    const expectedResult = steps
      .map((step, index) => (step.expectedResult ? `${index + 1}. ${step.expectedResult}` : ''))
      .filter(Boolean)
      .join('\n');

    return {
      steps: serializedSteps,
      expectedResult: expectedResult || undefined,
    };
  }

  private suiteKey(parentId: number | null, name: string): string {
    return `${parentId ?? 'root'}::${name.trim().toLowerCase()}`;
  }

  private resolveProjectKey(projectKey: string | null | undefined, projectId: number): string {
    const normalized = projectKey?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') ?? '';
    if (normalized && /^[A-Z]/.test(normalized)) {
      return normalized;
    }
    return `PRJ${projectId}`;
  }

  private async getNextTestCaseSequence(projectId: number, projectKey: string): Promise<number> {
    const items = await this.testCasesRepository.find({
      where: { projectId },
      select: ['key'],
    });

    const keyMatcher = new RegExp(`^${this.escapeRegex(projectKey)}-(\\d+)$`);
    let max = 0;

    for (const item of items) {
      if (!item.key) continue;
      const match = keyMatcher.exec(item.key);
      if (!match) continue;

      const parsed = Number(match[1]);
      if (Number.isInteger(parsed) && parsed > max) {
        max = parsed;
      }
    }

    return max + 1;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private escapeCsvCell(value: string): string {
    const normalized = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (!/[",\n]/.test(normalized)) {
      return normalized;
    }

    return `"${normalized.replace(/"/g, '""')}"`;
  }

  private hasTrackedChanges(previous: TestCase, next: TestCase): boolean {
    return (
      previous.title !== next.title ||
      (previous.description ?? null) !== (next.description ?? null) ||
      (previous.precondition ?? null) !== (next.precondition ?? null) ||
      (previous.preconditionId ?? null) !== (next.preconditionId ?? null) ||
      (previous.steps ?? null) !== (next.steps ?? null) ||
      (previous.expectedResult ?? null) !== (next.expectedResult ?? null) ||
      previous.status !== next.status ||
      previous.priority !== next.priority ||
      (previous.testSuiteId ?? null) !== (next.testSuiteId ?? null)
    );
  }

  private async createRevisionSnapshot(testCase: TestCase, changedById: number): Promise<void> {
    const latest = await this.testCaseRevisionsRepository.findOne({
      where: { testCaseId: testCase.id },
      order: { version: 'DESC' },
    });

    const revision = this.testCaseRevisionsRepository.create({
      testCaseId: testCase.id,
      version: latest ? latest.version + 1 : 1,
      title: testCase.title,
      description: testCase.description,
      precondition: testCase.precondition,
      preconditionId: testCase.preconditionId,
      steps: testCase.steps,
      expectedResult: testCase.expectedResult,
      status: testCase.status,
      priority: testCase.priority,
      testSuiteId: testCase.testSuiteId,
      changedById,
    });

    await this.testCaseRevisionsRepository.save(revision);
  }

  private async resolvePreconditionId(
    projectId: number,
    preconditionId: number | null | undefined,
  ): Promise<number | null> {
    if (preconditionId === undefined) return null;
    if (preconditionId === null) return null;

    const linked = await this.preconditionsRepository.findOneBy({ id: preconditionId, projectId });
    if (!linked) {
      throw new NotFoundException(`Precondition #${preconditionId} not found`);
    }
    return linked.id;
  }
}

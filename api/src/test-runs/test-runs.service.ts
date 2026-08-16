import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TestRun, TestRunStatus } from './entities/test-run.entity';
import { TestResult, TestResultStatus } from '../test-results/entities/test-result.entity';
import { CreateTestRunDto, UpdateTestRunDto } from './dto/test-run.dto';
import { UpdateTestResultDto } from '../test-results/dto/update-test-result.dto';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class TestRunsService {
  constructor(
    @InjectRepository(TestRun)
    private readonly testRunsRepository: Repository<TestRun>,
    @InjectRepository(TestResult)
    private readonly testResultsRepository: Repository<TestResult>,
    private readonly projectsService: ProjectsService,
  ) {}

  async create(projectId: number, dto: CreateTestRunDto, userId: number): Promise<TestRun> {
    await this.projectsService.findOne(projectId, userId);
    const testRun = this.testRunsRepository.create({ name: dto.name, description: dto.description, projectId, createdById: userId });
    const savedRun = await this.testRunsRepository.save(testRun);
    // create a pending result for each test case
    const results = dto.testCaseIds.map((testCaseId) =>
      this.testResultsRepository.create({ testRunId: savedRun.id, testCaseId, status: TestResultStatus.PENDING }),
    );
    await this.testResultsRepository.save(results);
    return this.findOne(savedRun.id, projectId, userId);
  }

  async findAll(projectId: number, userId: number): Promise<TestRun[]> {
    await this.projectsService.findOne(projectId, userId);
    return this.testRunsRepository.find({ where: { projectId }, relations: ['results', 'results.defects', 'results.attachments'], order: { createdAt: 'DESC' } });
  }

  async findOne(id: number, projectId: number, userId: number): Promise<TestRun> {
    await this.projectsService.findOne(projectId, userId);
    const run = await this.testRunsRepository.findOne({ where: { id, projectId }, relations: ['results', 'results.testCase', 'results.defects', 'results.attachments'] });
    if (!run) throw new NotFoundException(`Test run #${id} not found`);
    return run;
  }

  async update(id: number, projectId: number, dto: UpdateTestRunDto, userId: number): Promise<TestRun> {
    await this.findOne(id, projectId, userId);
    await this.testRunsRepository.update(id, dto);
    return this.findOne(id, projectId, userId);
  }

  async remove(id: number, projectId: number, userId: number): Promise<void> {
    await this.findOne(id, projectId, userId);
    await this.testRunsRepository.delete(id);
  }

  async updateResult(
    resultId: number,
    projectId: number,
    dto: UpdateTestResultDto,
    userId: number,
  ): Promise<TestResult> {
    const result = await this.testResultsRepository.findOne({
      where: { id: resultId },
      relations: ['testCase', 'testRun'],
    });
    if (!result) throw new NotFoundException(`Result #${resultId} not found`);
    if (result.testRun?.projectId !== projectId) {
      throw new NotFoundException(`Result #${resultId} not found in this project`);
    }
    await this.projectsService.findOne(projectId, userId);
    Object.assign(result, { ...dto, executedById: userId });
    const saved = await this.testResultsRepository.save(result);

    // Recalculate and update the parent run status
    const allResults = await this.testResultsRepository.findBy({ testRunId: result.testRunId });
    const allDone = allResults.every((r) => r.status !== TestResultStatus.PENDING);
    const anyStarted = allResults.some((r) => r.status !== TestResultStatus.PENDING);
    const newRunStatus = allDone
      ? TestRunStatus.COMPLETED
      : anyStarted
        ? TestRunStatus.IN_PROGRESS
        : TestRunStatus.PENDING;
    await this.testRunsRepository.update(result.testRunId, { status: newRunStatus });

    return saved;
  }

  /**
   * Get aggregated pass/fail stats for a project.
   */
  async getProjectStats(projectId: number, userId: number) {
    await this.projectsService.findOne(projectId, userId);

    // Get all runs with results for this project
    const runs = await this.testRunsRepository.find({
      where: { projectId },
      relations: ['results'],
      order: { createdAt: 'ASC' },
    });

    // Overall totals
    let totalPassed = 0;
    let totalFailed = 0;
    let totalBlocked = 0;
    let totalSkipped = 0;
    let totalPending = 0;

    // Per-run breakdown for trend chart
    const runStats = runs.map((run) => {
      const passed = run.results.filter((r) => r.status === TestResultStatus.PASSED).length;
      const failed = run.results.filter((r) => r.status === TestResultStatus.FAILED).length;
      const blocked = run.results.filter((r) => r.status === TestResultStatus.BLOCKED).length;
      const skipped = run.results.filter((r) => r.status === TestResultStatus.SKIPPED).length;
      const pending = run.results.filter((r) => r.status === TestResultStatus.PENDING).length;
      const total = run.results.length;
      const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

      totalPassed += passed;
      totalFailed += failed;
      totalBlocked += blocked;
      totalSkipped += skipped;
      totalPending += pending;

      return {
        runId: run.id,
        name: run.name,
        status: run.status,
        createdAt: run.createdAt,
        passed,
        failed,
        blocked,
        skipped,
        pending,
        total,
        passRate,
      };
    });

    const totalResults = totalPassed + totalFailed + totalSkipped + totalPending;
    const overallPassRate = totalResults > 0 ? Math.round((totalPassed / totalResults) * 100) : 0;

    return {
      overall: {
        passed: totalPassed,
        failed: totalFailed,
        blocked: totalBlocked,
        skipped: totalSkipped,
        pending: totalPending,
        total: totalResults,
        passRate: overallPassRate,
        totalRuns: runs.length,
      },
      runs: runStats,
    };
  }
}

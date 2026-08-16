import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { OrganizationsService } from '../organizations/organizations.service';
import { TestResult } from '../test-results/entities/test-result.entity';

export interface ProjectOverallStats {
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  pending: number;
  total: number;
  passRate: number;
  totalRuns: number;
}

interface ProjectStatsRowAggregate {
  projectId: number;
  passed: string;
  failed: string;
  blocked: string;
  skipped: string;
  pending: string;
  totalRuns: string;
}

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(TestResult)
    private readonly testResultsRepository: Repository<TestResult>,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async create(createProjectDto: CreateProjectDto, userId: number): Promise<Project> {
    const organizationId =
      createProjectDto.organizationId ?? (await this.organizationsService.getDefaultOrganizationId(userId));
    await this.organizationsService.assertMembership(userId, organizationId);
    const key = await this.generateUniqueProjectKey(createProjectDto.name, organizationId);

    const project = this.projectsRepository.create({
      ...createProjectDto,
      key,
      organizationId,
      ownerId: userId,
    });
    return this.projectsRepository.save(project);
  }

  async findAll(userId: number): Promise<Project[]> {
    const organizationIds = await this.organizationsService.getAccessibleOrganizationIds(userId);
    if (organizationIds.length === 0) return [];

    return this.projectsRepository.find({ where: { organizationId: In(organizationIds) } });
  }

  /**
   * Return every project accessible to the user together with its overall test
   * stats, computed in a single grouped query. This is the aggregated
   * replacement for the dashboard's previous N+1 pattern (one stats request per
   * project).
   */
  async getProjectsStatsSummary(
    userId: number,
  ): Promise<{ projects: (Project & { stats: ProjectOverallStats })[] }> {
    const projects = await this.findAll(userId);
    if (projects.length === 0) return { projects: [] };

    const projectIds = projects.map((p) => p.id);

    const rows: ProjectStatsRowAggregate[] = await this.testResultsRepository.query(
      `SELECT tr.project_id AS "projectId",
              COALESCE(SUM(CASE WHEN r.status = 'passed' THEN 1 ELSE 0 END), 0) AS passed,
              COALESCE(SUM(CASE WHEN r.status = 'failed' THEN 1 ELSE 0 END), 0) AS failed,
              COALESCE(SUM(CASE WHEN r.status = 'blocked' THEN 1 ELSE 0 END), 0) AS blocked,
              COALESCE(SUM(CASE WHEN r.status = 'skipped' THEN 1 ELSE 0 END), 0) AS skipped,
              COALESCE(SUM(CASE WHEN r.status = 'pending' THEN 1 ELSE 0 END), 0) AS pending,
              COUNT(DISTINCT tr.id) AS "totalRuns"
       FROM test_runs tr
       INNER JOIN test_results r ON r.test_run_id = tr.id
       WHERE tr.project_id = ANY($1)
       GROUP BY tr.project_id`,
      [projectIds],
    );

    const statsByProject = new Map<number, ProjectOverallStats>();
    for (const row of rows) {
      const passed = Number(row.passed);
      const failed = Number(row.failed);
      const blocked = Number(row.blocked);
      const skipped = Number(row.skipped);
      const pending = Number(row.pending);
      const total = passed + failed + skipped + pending;
      statsByProject.set(row.projectId, {
        passed,
        failed,
        blocked,
        skipped,
        pending,
        total,
        passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
        totalRuns: Number(row.totalRuns),
      });
    }

    const zeroStats: ProjectOverallStats = {
      passed: 0,
      failed: 0,
      blocked: 0,
      skipped: 0,
      pending: 0,
      total: 0,
      passRate: 0,
      totalRuns: 0,
    };

    return {
      projects: projects.map((project) => ({
        ...project,
        stats: statsByProject.get(project.id) ?? zeroStats,
      })),
    };
  }

  async findOne(id: number, userId: number): Promise<Project> {
    const project = await this.projectsRepository.findOneBy({ id });
    if (!project) throw new NotFoundException(`Project #${id} not found`);
    await this.organizationsService.assertMembership(userId, project.organizationId);
    return project;
  }

  async update(id: number, updateProjectDto: UpdateProjectDto, userId: number): Promise<Project> {
    await this.findOne(id, userId);
    await this.projectsRepository.update(id, updateProjectDto);
    return this.findOne(id, userId);
  }

  async remove(id: number, userId: number): Promise<void> {
    await this.findOne(id, userId);
    await this.projectsRepository.delete(id);
  }

  private async generateUniqueProjectKey(name: string, organizationId: number): Promise<string> {
    const base = this.buildProjectKeyBase(name);

    for (let counter = 1; counter <= 9999; counter += 1) {
      const suffix = counter === 1 ? '' : String(counter);
      const prefixMaxLength = 10 - suffix.length;
      const prefix = base.slice(0, Math.max(1, prefixMaxLength));
      const candidate = `${prefix}${suffix}`;

      const existing = await this.projectsRepository.findOneBy({
        organizationId,
        key: candidate,
      });

      if (!existing) {
        return candidate;
      }
    }

    throw new BadRequestException('Unable to generate a unique project key. Please use a different name.');
  }

  private buildProjectKeyBase(name: string): string {
    const normalized = name.toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
    const firstToken = normalized.split(/\s+/).find(Boolean) ?? 'PRJ';
    let base = firstToken.replace(/[^A-Z0-9]/g, '');

    if (!base) {
      base = 'PRJ';
    }

    if (!/^[A-Z]/.test(base)) {
      base = `P${base}`;
    }

    if (base.length < 2) {
      base = `${base}R`;
    }

    return base.slice(0, 10);
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProjectsService } from './projects.service';
import { Project } from './entities/project.entity';
import { TestResult } from '../test-results/entities/test-result.entity';
import { OrganizationsService } from '../organizations/organizations.service';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let organizationsService: OrganizationsService;
  let testResultsRepository: { query: jest.Mock };

  beforeEach(async () => {
    testResultsRepository = { query: jest.fn() };
    organizationsService = {
      getAccessibleOrganizationIds: jest.fn(),
      getDefaultOrganizationId: jest.fn(),
      assertMembership: jest.fn(),
    } as unknown as OrganizationsService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: getRepositoryToken(Project), useValue: {} },
        { provide: getRepositoryToken(TestResult), useValue: testResultsRepository },
        { provide: OrganizationsService, useValue: organizationsService },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should build per-project stats from the aggregated query', async () => {
    (organizationsService.getAccessibleOrganizationIds as jest.Mock).mockResolvedValue([1]);
    jest
      .spyOn(service, 'findAll')
      .mockResolvedValue([
        { id: 1, name: 'A' } as Project,
        { id: 2, name: 'B' } as Project,
      ]);
    testResultsRepository.query.mockResolvedValue([
      { projectId: 1, passed: '3', failed: '1', blocked: '1', skipped: '0', pending: '1', totalRuns: '2' },
    ]);

    const { projects } = await service.getProjectsStatsSummary(9);

    expect(projects).toHaveLength(2);
    // Project 1 has real aggregated stats; total excludes blocked (matching getProjectStats)
    expect(projects[0].stats).toEqual({
      passed: 3,
      failed: 1,
      blocked: 1,
      skipped: 0,
      pending: 1,
      total: 5,
      passRate: 60,
      totalRuns: 2,
    });
    // Project 2 has no rows -> zeroed stats
    expect(projects[1].stats).toEqual({
      passed: 0,
      failed: 0,
      blocked: 0,
      skipped: 0,
      pending: 0,
      total: 0,
      passRate: 0,
      totalRuns: 0,
    });
    expect(testResultsRepository.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM test_runs'),
      [[1, 2]],
    );
  });
});

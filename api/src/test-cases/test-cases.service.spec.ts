import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TestCasesService } from './test-cases.service';
import { TestCase } from './entities/test-case.entity';
import { TestSuite } from '../test-suites/entities/test-suite.entity';
import { TestCaseRevision } from './entities/test-case-revision.entity';
import { Precondition } from '../preconditions/entities/precondition.entity';
import { ProjectsService } from '../projects/projects.service';

interface MockQb {
  leftJoinAndSelect: jest.Mock;
  where: jest.Mock;
  andWhere: jest.Mock;
  orderBy: jest.Mock;
  clone: jest.Mock;
  skip: jest.Mock;
  take: jest.Mock;
  getCount: jest.Mock;
  getMany: jest.Mock;
}

function makeQb(): MockQb {
  const qb: MockQb = {
    leftJoinAndSelect: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    clone: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    getCount: jest.fn(),
    getMany: jest.fn(),
  };
  qb.leftJoinAndSelect.mockReturnValue(qb);
  qb.where.mockReturnValue(qb);
  qb.andWhere.mockReturnValue(qb);
  qb.orderBy.mockReturnValue(qb);
  qb.clone.mockReturnValue(qb);
  qb.skip.mockReturnValue(qb);
  qb.take.mockReturnValue(qb);
  return qb;
}

describe('TestCasesService', () => {
  let service: TestCasesService;
  let qb: MockQb;
  let projectsService: { findOne: jest.Mock };

  beforeEach(async () => {
    qb = makeQb();
    projectsService = { findOne: jest.fn().mockResolvedValue({ id: 1 }) };
    const testCasesRepository = { createQueryBuilder: jest.fn(() => qb) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestCasesService,
        { provide: getRepositoryToken(TestCase), useValue: testCasesRepository },
        { provide: getRepositoryToken(TestSuite), useValue: {} },
        { provide: getRepositoryToken(TestCaseRevision), useValue: {} },
        { provide: getRepositoryToken(Precondition), useValue: {} },
        { provide: ProjectsService, useValue: projectsService },
      ],
    }).compile();

    service = module.get<TestCasesService>(TestCasesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns a plain array when no limit is provided', async () => {
    qb.getMany.mockResolvedValue([{ id: 1 }]);

    const result = await service.findAll(1, 9, {});

    expect(result).toEqual([{ id: 1 }]);
    expect(qb.take).not.toHaveBeenCalled();
    expect(qb.getCount).not.toHaveBeenCalled();
  });

  it('returns a { total, items } envelope when a limit is provided', async () => {
    qb.getCount.mockResolvedValue(5);
    qb.getMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    const result = await service.findAll(1, 9, { limit: 2, offset: 0 });

    expect(result).toEqual({ total: 5, items: [{ id: 1 }, { id: 2 }] });
    expect(qb.skip).toHaveBeenCalledWith(0);
    expect(qb.take).toHaveBeenCalledWith(2);
    expect(projectsService.findOne).toHaveBeenCalledWith(1, 9);
  });

  it('applies search and suite/assigned filters to the query', async () => {
    qb.getMany.mockResolvedValue([{ id: 1 }]);

    await service.findAll(1, 9, { q: 'login', suiteIds: [2, 3], unassigned: false });

    const andWhereCalls = qb.andWhere.mock.calls.map((call) => call[0]);
    // title/description search
    expect(andWhereCalls.join(' ')).toContain('tc.title');
    // IN suite filter
    expect(andWhereCalls.join(' ')).toContain('IN (:...suiteIds)');
    expect(qb.andWhere.mock.calls?.[1]?.[1]).toEqual({ suiteIds: [2, 3] });
  });

  it('adds an IS NULL constraint when unassigned is requested', async () => {
    qb.getMany.mockResolvedValue([]);

    await service.findAll(1, 9, { q: '', suiteIds: [], unassigned: true });

    expect(qb.andWhere.mock.calls.map((call) => call[0]).join(' ')).toContain('IS NULL');
  });
});

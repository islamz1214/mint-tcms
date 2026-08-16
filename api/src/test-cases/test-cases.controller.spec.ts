import { Test, TestingModule } from '@nestjs/testing';
import { TestCasesController } from './test-cases.controller';
import { TestCasesService } from './test-cases.service';

describe('TestCasesController', () => {
  let controller: TestCasesController;
  let testCasesService: { findAll: jest.Mock };

  beforeEach(async () => {
    testCasesService = { findAll: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TestCasesController],
      providers: [{ provide: TestCasesService, useValue: testCasesService }],
    }).compile();

    controller = module.get<TestCasesController>(TestCasesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('passes no filters when the query is empty', () => {
    testCasesService.findAll.mockResolvedValue([]);

    controller.findAll('5', { user: { id: 7 } }, {});

    expect(testCasesService.findAll).toHaveBeenCalledWith(5, 7, {
      limit: undefined,
      offset: undefined,
      q: undefined,
      suiteIds: undefined,
      unassigned: false,
    });
  });

  it('parses limit/offset/search/suite/assigned query params', () => {
    testCasesService.findAll.mockResolvedValue({ total: 0, items: [] });

    controller.findAll('5', { user: { id: 7 } }, {
      limit: '200',
      offset: '400',
      q: 'login',
      suiteIds: '2,3,abc',
      unassigned: 'false',
    });

    expect(testCasesService.findAll).toHaveBeenCalledWith(5, 7, {
      limit: 200,
      offset: 400,
      q: 'login',
      suiteIds: [2, 3],
      unassigned: false,
    });
  });

  it('sets unassigned when the flag is truthy', () => {
    testCasesService.findAll.mockResolvedValue({ total: 0, items: [] });

    controller.findAll('5', { user: { id: 7 } }, { unassigned: 'true' });

    expect(testCasesService.findAll).toHaveBeenLastCalledWith(5, 7, {
      limit: undefined,
      offset: undefined,
      q: undefined,
      suiteIds: undefined,
      unassigned: true,
    });
  });
});

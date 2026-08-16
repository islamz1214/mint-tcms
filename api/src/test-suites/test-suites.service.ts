import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { TestSuite } from './entities/test-suite.entity';
import { CreateTestSuiteDto } from './dto/create-test-suite.dto';
import { UpdateTestSuiteDto } from './dto/update-test-suite.dto';
import { ProjectsService } from '../projects/projects.service';
import { TestCase } from '../test-cases/entities/test-case.entity';

@Injectable()
export class TestSuitesService {
  constructor(
    @InjectRepository(TestSuite)
    private readonly testSuitesRepository: Repository<TestSuite>,
    @InjectRepository(TestCase)
    private readonly testCasesRepository: Repository<TestCase>,
    private readonly projectsService: ProjectsService,
  ) {}

  async create(projectId: number, dto: CreateTestSuiteDto, userId: number): Promise<TestSuite> {
    await this.projectsService.findOne(projectId, userId);

    // validate parentId belongs to same project
    if (dto.parentId) {
      const parent = await this.testSuitesRepository.findOneBy({
        id: dto.parentId,
        projectId,
      });
      if (!parent) throw new BadRequestException('Parent suite not found in this project');
    }

    const suite = this.testSuitesRepository.create({
      ...dto,
      projectId,
      parentId: dto.parentId ?? null,
    });
    return this.testSuitesRepository.save(suite);
  }

  async findAll(projectId: number, userId: number): Promise<TestSuite[]> {
    await this.projectsService.findOne(projectId, userId);
    return this.testSuitesRepository.find({
      where: { projectId },
      relations: ['testCases'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Returns the full tree structure for a project:
   * - Root suites (no parent) with recursively nested children
   * - Each suite includes its direct test cases
   * - Unassigned test cases (no suite) returned separately
   */
  async findTree(
    projectId: number,
    userId: number,
  ): Promise<{ suites: any[]; unassignedCases: TestCase[] }> {
    await this.projectsService.findOne(projectId, userId);

    // Fetch all suites for this project with their test cases
    const allSuites = await this.testSuitesRepository.find({
      where: { projectId },
      relations: ['testCases'],
      order: { name: 'ASC' },
    });

    // Fetch unassigned test cases
    const unassignedCases = await this.testCasesRepository.find({
      where: { projectId, testSuiteId: IsNull() },
      order: { title: 'ASC' },
    });

    // Build the tree in memory
    const suiteMap = new Map<number, any>();
    for (const s of allSuites) {
      suiteMap.set(s.id, { ...s, children: [] });
    }

    const roots: any[] = [];
    for (const s of suiteMap.values()) {
      if (s.parentId && suiteMap.has(s.parentId)) {
        suiteMap.get(s.parentId).children.push(s);
      } else {
        roots.push(s);
      }
    }

    return { suites: roots, unassignedCases };
  }

  async findOne(id: number, projectId: number, userId: number): Promise<TestSuite> {
    await this.projectsService.findOne(projectId, userId);
    const suite = await this.testSuitesRepository.findOne({
      where: { id, projectId },
      relations: ['testCases', 'children', 'parent'],
    });
    if (!suite) throw new NotFoundException(`Test suite #${id} not found`);
    return suite;
  }

  async update(id: number, projectId: number, dto: UpdateTestSuiteDto, userId: number): Promise<TestSuite> {
    const suite = await this.findOne(id, projectId, userId);

    // Prevent setting self as parent
    if (dto.parentId !== undefined) {
      if (dto.parentId === id) {
        throw new BadRequestException('A suite cannot be its own parent');
      }
      if (dto.parentId !== null) {
        const parent = await this.testSuitesRepository.findOneBy({
          id: dto.parentId,
          projectId,
        });
        if (!parent) throw new BadRequestException('Parent suite not found in this project');

        // Prevent circular nesting: walk up from parent to ensure we don't hit `id`
        let current: TestSuite | null = parent;
        while (current?.parentId) {
          if (current.parentId === id) {
            throw new BadRequestException('Circular nesting is not allowed');
          }
          current = await this.testSuitesRepository.findOneBy({ id: current.parentId });
        }
      }
    }

    await this.testSuitesRepository.update(id, dto);
    return this.findOne(id, projectId, userId);
  }

  async remove(id: number, projectId: number, userId: number): Promise<void> {
    await this.findOne(id, projectId, userId);
    await this.testSuitesRepository.delete(id);
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let projectsService: { getProjectsStatsSummary: jest.Mock };

  beforeEach(async () => {
    projectsService = { getProjectsStatsSummary: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [{ provide: ProjectsService, useValue: projectsService }],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate stats-summary to the service with the user id', () => {
    projectsService.getProjectsStatsSummary.mockResolvedValue({ projects: [] });

    expect(controller.getStatsSummary({ user: { id: 7 } })).resolves.toEqual({ projects: [] });
    expect(projectsService.getProjectsStatsSummary).toHaveBeenCalledWith(7);
  });
});

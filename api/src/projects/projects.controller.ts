import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ALL_USER_ROLES, UserRole } from '../users/entities/user.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ALL_USER_ROLES)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER)
  @Post()
  create(@Body() createProjectDto: CreateProjectDto, @Request() req: any) {
    return this.projectsService.create(createProjectDto, req.user.id);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.projectsService.findAll(req.user.id);
  }

  // Aggregated dashboard stats for all accessible projects (single query).
  // Declared before the `:id` route so "stats-summary" is matched literally.
  @Get('stats-summary')
  getStatsSummary(@Request() req: any) {
    return this.projectsService.getProjectsStatsSummary(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.projectsService.findOne(+id, req.user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto, @Request() req: any) {
    return this.projectsService.update(+id, updateProjectDto, req.user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.projectsService.remove(+id, req.user.id);
  }
}

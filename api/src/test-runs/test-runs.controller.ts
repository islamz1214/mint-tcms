import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { TestRunsService } from './test-runs.service';
import { CreateTestRunDto, UpdateTestRunDto } from './dto/test-run.dto';
import { UpdateTestResultDto } from '../test-results/dto/update-test-result.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ALL_USER_ROLES, UserRole } from '../users/entities/user.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ALL_USER_ROLES)
@Controller('projects/:projectId/test-runs')
export class TestRunsController {
  constructor(private readonly testRunsService: TestRunsService) {}

  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER, UserRole.TESTER)
  @Post()
  create(@Param('projectId') projectId: string, @Body() dto: CreateTestRunDto, @Request() req: any) {
    return this.testRunsService.create(+projectId, dto, req.user.id);
  }

  @Get()
  findAll(@Param('projectId') projectId: string, @Request() req: any) {
    return this.testRunsService.findAll(+projectId, req.user.id);
  }

  @Get('stats')
  getStats(@Param('projectId') projectId: string, @Request() req: any) {
    return this.testRunsService.getProjectStats(+projectId, req.user.id);
  }

  @Get(':id')
  findOne(@Param('projectId') projectId: string, @Param('id') id: string, @Request() req: any) {
    return this.testRunsService.findOne(+id, +projectId, req.user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER)
  @Patch(':id')
  update(@Param('projectId') projectId: string, @Param('id') id: string, @Body() dto: UpdateTestRunDto, @Request() req: any) {
    return this.testRunsService.update(+id, +projectId, dto, req.user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER)
  @Delete(':id')
  remove(@Param('projectId') projectId: string, @Param('id') id: string, @Request() req: any) {
    return this.testRunsService.remove(+id, +projectId, req.user.id);
  }

  // Update individual test result (pass/fail)
  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER, UserRole.TESTER)
  @Patch(':id/results/:resultId')
  updateResult(
    @Param('projectId') projectId: string,
    @Param('resultId') resultId: string,
    @Body() dto: UpdateTestResultDto,
    @Request() req: any,
  ) {
    return this.testRunsService.updateResult(+resultId, +projectId, dto, req.user.id);
  }
}

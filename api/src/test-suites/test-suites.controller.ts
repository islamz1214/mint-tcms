import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { TestSuitesService } from './test-suites.service';
import { CreateTestSuiteDto } from './dto/create-test-suite.dto';
import { UpdateTestSuiteDto } from './dto/update-test-suite.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ALL_USER_ROLES, UserRole } from '../users/entities/user.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ALL_USER_ROLES)
@Controller('projects/:projectId/test-suites')
export class TestSuitesController {
  constructor(private readonly testSuitesService: TestSuitesService) {}

  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER)
  @Post()
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateTestSuiteDto,
    @Request() req: any,
  ) {
    return this.testSuitesService.create(+projectId, dto, req.user.id);
  }

  @Get()
  findAll(@Param('projectId') projectId: string, @Request() req: any) {
    return this.testSuitesService.findAll(+projectId, req.user.id);
  }

  @Get('tree')
  findTree(@Param('projectId') projectId: string, @Request() req: any) {
    return this.testSuitesService.findTree(+projectId, req.user.id);
  }

  @Get(':id')
  findOne(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.testSuitesService.findOne(+id, +projectId, req.user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER)
  @Patch(':id')
  update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTestSuiteDto,
    @Request() req: any,
  ) {
    return this.testSuitesService.update(+id, +projectId, dto, req.user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER)
  @Delete(':id')
  remove(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.testSuitesService.remove(+id, +projectId, req.user.id);
  }
}

import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirementsService } from './requirements.service';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ALL_USER_ROLES, UserRole } from '../users/entities/user.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ALL_USER_ROLES)
@Controller('projects/:projectId/requirements')
export class RequirementsController {
  constructor(private readonly requirementsService: RequirementsService) {}

  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER)
  @Post()
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateRequirementDto,
    @Request() req: any,
  ) {
    return this.requirementsService.create(+projectId, dto, req.user.id);
  }

  @Get()
  findAll(@Param('projectId') projectId: string, @Request() req: any) {
    return this.requirementsService.findAll(+projectId, req.user.id);
  }

  @Get('matrix')
  findMatrix(@Param('projectId') projectId: string, @Request() req: any) {
    return this.requirementsService.findMatrix(+projectId, req.user.id);
  }

  @Get(':id')
  findOne(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.requirementsService.findOne(+id, +projectId, req.user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER)
  @Patch(':id')
  update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRequirementDto,
    @Request() req: any,
  ) {
    return this.requirementsService.update(+id, +projectId, dto, req.user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER)
  @Delete(':id')
  remove(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.requirementsService.remove(+id, +projectId, req.user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER)
  @Post(':id/test-cases/:testCaseId')
  linkTestCase(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Param('testCaseId') testCaseId: string,
    @Request() req: any,
  ) {
    return this.requirementsService.linkTestCase(+id, +projectId, +testCaseId, req.user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER)
  @Delete(':id/test-cases/:testCaseId')
  unlinkTestCase(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Param('testCaseId') testCaseId: string,
    @Request() req: any,
  ) {
    return this.requirementsService.unlinkTestCase(+id, +projectId, +testCaseId, req.user.id);
  }
}

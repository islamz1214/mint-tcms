import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TestPlansService } from './test-plans.service';
import { CreateTestPlanDto } from './dto/create-test-plan.dto';
import { UpdateTestPlanDto } from './dto/update-test-plan.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ALL_USER_ROLES, UserRole } from '../users/entities/user.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ALL_USER_ROLES)
@Controller('projects/:projectId/test-plans')
export class TestPlansController {
  constructor(private readonly testPlansService: TestPlansService) {}

  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER)
  @Post()
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateTestPlanDto,
    @Request() req: any,
  ) {
    return this.testPlansService.create(+projectId, dto, req.user.id);
  }

  @Get()
  findAll(@Param('projectId') projectId: string, @Request() req: any) {
    return this.testPlansService.findAll(+projectId, req.user.id);
  }

  @Get(':id')
  findOne(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.testPlansService.findOne(+id, +projectId, req.user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER)
  @Patch(':id')
  update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTestPlanDto,
    @Request() req: any,
  ) {
    return this.testPlansService.update(+id, +projectId, dto, req.user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER)
  @Delete(':id')
  remove(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.testPlansService.remove(+id, +projectId, req.user.id);
  }
}

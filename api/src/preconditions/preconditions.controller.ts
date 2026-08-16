import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ALL_USER_ROLES, UserRole } from '../users/entities/user.entity';
import { PreconditionsService } from './preconditions.service';
import { CreatePreconditionDto } from './dto/create-precondition.dto';
import { UpdatePreconditionDto } from './dto/update-precondition.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ALL_USER_ROLES)
@Controller('projects/:projectId/preconditions')
export class PreconditionsController {
  constructor(private readonly preconditionsService: PreconditionsService) {}

  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER)
  @Post()
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreatePreconditionDto,
    @Request() req: any,
  ) {
    return this.preconditionsService.create(+projectId, dto, req.user.id);
  }

  @Get()
  findAll(@Param('projectId') projectId: string, @Request() req: any) {
    return this.preconditionsService.findAll(+projectId, req.user.id);
  }

  @Get(':id')
  findOne(@Param('projectId') projectId: string, @Param('id') id: string, @Request() req: any) {
    return this.preconditionsService.findOne(+id, +projectId, req.user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER)
  @Patch(':id')
  update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePreconditionDto,
    @Request() req: any,
  ) {
    return this.preconditionsService.update(+id, +projectId, dto, req.user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER)
  @Delete(':id')
  remove(@Param('projectId') projectId: string, @Param('id') id: string, @Request() req: any) {
    return this.preconditionsService.remove(+id, +projectId, req.user.id);
  }
}

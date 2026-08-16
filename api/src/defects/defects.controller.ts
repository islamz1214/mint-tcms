import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateDefectDto } from './dto/create-defect.dto';
import { UpdateDefectDto } from './dto/update-defect.dto';
import { DefectsService } from './defects.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ALL_USER_ROLES, UserRole } from '../users/entities/user.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ALL_USER_ROLES)
@Controller('projects/:projectId/defects')
export class DefectsController {
  constructor(private readonly defectsService: DefectsService) {}

  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER, UserRole.TESTER)
  @Post()
  create(@Param('projectId') projectId: string, @Body() dto: CreateDefectDto, @Request() req: any) {
    return this.defectsService.create(+projectId, dto, req.user.id);
  }

  @Get()
  findAll(@Param('projectId') projectId: string, @Request() req: any) {
    return this.defectsService.findAll(+projectId, req.user.id);
  }

  @Get(':id')
  findOne(@Param('projectId') projectId: string, @Param('id') id: string, @Request() req: any) {
    return this.defectsService.findOne(+id, +projectId, req.user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER, UserRole.TESTER)
  @Patch(':id')
  update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDefectDto,
    @Request() req: any,
  ) {
    return this.defectsService.update(+id, +projectId, dto, req.user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER)
  @Delete(':id')
  remove(@Param('projectId') projectId: string, @Param('id') id: string, @Request() req: any) {
    return this.defectsService.remove(+id, +projectId, req.user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER, UserRole.TESTER)
  @Post(':id/results/:resultId')
  linkResult(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Param('resultId') resultId: string,
    @Request() req: any,
  ) {
    return this.defectsService.linkResult(+id, +projectId, +resultId, req.user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER, UserRole.TESTER)
  @Delete(':id/results/:resultId')
  unlinkResult(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Param('resultId') resultId: string,
    @Request() req: any,
  ) {
    return this.defectsService.unlinkResult(+id, +projectId, +resultId, req.user.id);
  }
}
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ALL_USER_ROLES } from '../users/entities/user.entity';
import { OrganizationsService } from './organizations.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateOrganizationMemberRoleDto } from './dto/update-organization-member-role.dto';
import { CreateOrganizationInvitationDto } from './dto/create-organization-invitation.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ALL_USER_ROLES)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.organizationsService.listForUser(req.user.id);
  }

  @Get(':organizationId')
  findOne(@Param('organizationId', ParseIntPipe) organizationId: number, @Request() req: any) {
    return this.organizationsService.getDetailsForUser(req.user.id, organizationId);
  }

  @Patch(':organizationId')
  update(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() body: UpdateOrganizationDto,
    @Request() req: any,
  ) {
    return this.organizationsService.updateName(req.user.id, organizationId, body.name);
  }

  @Get(':organizationId/members')
  findMembers(@Param('organizationId', ParseIntPipe) organizationId: number, @Request() req: any) {
    return this.organizationsService.listMembers(req.user.id, organizationId);
  }

  @Patch(':organizationId/members/:memberId')
  updateMemberRole(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @Body() body: UpdateOrganizationMemberRoleDto,
    @Request() req: any,
  ) {
    return this.organizationsService.updateMemberRole(
      req.user.id,
      organizationId,
      memberId,
      body.role,
    );
  }

  @Delete(':organizationId/members/:memberId')
  removeMember(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @Request() req: any,
  ) {
    return this.organizationsService.removeMember(req.user.id, organizationId, memberId);
  }

  @Get(':organizationId/invitations')
  findInvitations(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Request() req: any,
  ) {
    return this.organizationsService.listInvitations(req.user.id, organizationId);
  }

  @Post(':organizationId/invitations')
  createInvitation(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() body: CreateOrganizationInvitationDto,
    @Request() req: any,
  ) {
    return this.organizationsService.createInvitation(
      req.user.id,
      organizationId,
      body.email,
      body.role,
    );
  }

  @Delete(':organizationId/invitations/:invitationId')
  revokeInvitation(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('invitationId', ParseIntPipe) invitationId: number,
    @Request() req: any,
  ) {
    return this.organizationsService.revokeInvitation(req.user.id, organizationId, invitationId);
  }
}
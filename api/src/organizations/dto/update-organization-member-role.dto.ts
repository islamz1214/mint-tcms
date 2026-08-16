import { IsEnum } from 'class-validator';
import { OrganizationMemberRole } from '../entities/organization-member.entity';

export class UpdateOrganizationMemberRoleDto {
  @IsEnum(OrganizationMemberRole)
  role: OrganizationMemberRole;
}

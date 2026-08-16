import { IsEmail, IsEnum } from 'class-validator';
import { OrganizationMemberRole } from '../entities/organization-member.entity';

export class CreateOrganizationInvitationDto {
  @IsEmail()
  email: string = '';

  @IsEnum(OrganizationMemberRole)
  role: OrganizationMemberRole = OrganizationMemberRole.TESTER;
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { OrganizationMember } from './entities/organization-member.entity';
import { OrganizationInvitation } from './entities/organization-invitation.entity';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, OrganizationMember, OrganizationInvitation, User]),
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [TypeOrmModule, OrganizationsService],
})
export class OrganizationsModule {}

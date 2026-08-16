import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager, In, QueryFailedError, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Organization } from './entities/organization.entity';
import {
  ALL_ORGANIZATION_MEMBER_ROLES,
  OrganizationMember,
  OrganizationMemberRole,
} from './entities/organization-member.entity';
import {
  OrganizationInvitation,
  OrganizationInvitationStatus,
} from './entities/organization-invitation.entity';

type OrganizationOverview = {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  membership: {
    id: number;
    role: OrganizationMemberRole;
    createdAt: Date;
    updatedAt: Date;
  };
};

type NewOrganizationOwner = Pick<User, 'id'>;

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationsRepository: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private readonly membershipsRepository: Repository<OrganizationMember>,
    @InjectRepository(OrganizationInvitation)
    private readonly invitationsRepository: Repository<OrganizationInvitation>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  private stripPassword(user: User | null): void {
    if (!user) return;
    const value = user as Partial<User>;
    delete value.password;
  }

  private isUniqueViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;
    const dbError = error as QueryFailedError & { driverError?: { code?: string } };
    return dbError.driverError?.code === '23505';
  }

  private async assertOrganizationNameAvailable(
    name: string,
    excludeOrganizationId?: number,
    manager: EntityManager = this.organizationsRepository.manager,
  ): Promise<void> {
    const normalizedName = name.trim();
    const organizations = manager.getRepository(Organization);
    const existing = await organizations
      .createQueryBuilder('organization')
      .where('LOWER(organization.name) = LOWER(:name)', { name: normalizedName })
      .getOne();

    if (existing && existing.id !== excludeOrganizationId) {
      throw new ConflictException('Organization name is already in use');
    }
  }

  async createPersonalOrganization(
    user: NewOrganizationOwner,
    organizationName: string,
    manager: EntityManager = this.organizationsRepository.manager,
  ): Promise<Organization> {
    const memberships = manager.getRepository(OrganizationMember);
    const organizations = manager.getRepository(Organization);
    const existingMembership = await memberships.findOne({
      where: { userId: user.id },
      relations: { organization: true },
      order: { createdAt: 'ASC' },
    });

    if (existingMembership) {
      return existingMembership.organization;
    }

    const normalizedName = organizationName.trim();
    await this.assertOrganizationNameAvailable(normalizedName, undefined, manager);

    let organization: Organization;
    try {
      organization = await organizations.save(
        organizations.create({ name: normalizedName }),
      );
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Organization name is already in use');
      }
      throw error;
    }
    await memberships.save(
      memberships.create({
        organizationId: organization.id,
        userId: user.id,
        role: OrganizationMemberRole.ADMIN,
      }),
    );

    return organization;
  }

  async getDefaultOrganizationId(userId: number): Promise<number> {
    const membership = await this.membershipsRepository.findOne({
      where: { userId },
      order: { createdAt: 'ASC' },
    });

    if (!membership) {
      throw new NotFoundException('No organization is available for this user');
    }

    return membership.organizationId;
  }

  async getAccessibleOrganizationIds(userId: number): Promise<number[]> {
    const memberships = await this.membershipsRepository.find({
      where: { userId },
      select: { organizationId: true },
    });
    return memberships.map((membership) => membership.organizationId);
  }

  async listForUser(userId: number): Promise<OrganizationOverview[]> {
    const memberships = await this.membershipsRepository.find({
      where: { userId },
      relations: { organization: true },
      order: { createdAt: 'ASC' },
    });

    return memberships.map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      createdAt: membership.organization.createdAt,
      updatedAt: membership.organization.updatedAt,
      membership: {
        id: membership.id,
        role: membership.role,
        createdAt: membership.createdAt,
        updatedAt: membership.updatedAt,
      },
    }));
  }

  async getDetailsForUser(userId: number, organizationId: number): Promise<OrganizationOverview> {
    const membership = await this.membershipsRepository.findOne({
      where: { userId, organizationId },
      relations: { organization: true },
    });

    if (!membership) {
      throw new NotFoundException('Organization membership not found');
    }

    return {
      id: membership.organization.id,
      name: membership.organization.name,
      createdAt: membership.organization.createdAt,
      updatedAt: membership.organization.updatedAt,
      membership: {
        id: membership.id,
        role: membership.role,
        createdAt: membership.createdAt,
        updatedAt: membership.updatedAt,
      },
    };
  }

  async updateName(userId: number, organizationId: number, name: string): Promise<OrganizationOverview> {
    await this.assertMembership(userId, organizationId, [OrganizationMemberRole.ADMIN]);
    const normalizedName = name.trim();
    await this.assertOrganizationNameAvailable(normalizedName, organizationId);
    try {
      await this.organizationsRepository.update(organizationId, { name: normalizedName });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Organization name is already in use');
      }
      throw error;
    }
    return this.getDetailsForUser(userId, organizationId);
  }

  async listMembers(userId: number, organizationId: number): Promise<OrganizationMember[]> {
    await this.assertMembership(userId, organizationId);
    const members = await this.membershipsRepository.find({
      where: { organizationId },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });
    for (const member of members) {
      this.stripPassword(member.user);
    }
    return members;
  }

  async updateMemberRole(
    userId: number,
    organizationId: number,
    memberId: number,
    role: OrganizationMemberRole,
  ): Promise<OrganizationMember> {
    await this.assertMembership(userId, organizationId, [OrganizationMemberRole.ADMIN]);

    const membership = await this.membershipsRepository.findOne({
      where: { id: memberId, organizationId },
      relations: { user: true },
    });
    if (!membership) {
      throw new NotFoundException('Organization member not found');
    }

    membership.role = role;
    const saved = await this.membershipsRepository.save(membership);
    this.stripPassword(saved.user);
    return saved;
  }

  async removeMember(
    userId: number,
    organizationId: number,
    memberId: number,
  ): Promise<{ success: true }> {
    await this.assertMembership(userId, organizationId, [OrganizationMemberRole.ADMIN]);

    const membership = await this.membershipsRepository.findOne({
      where: { id: memberId, organizationId },
    });
    if (!membership) {
      throw new NotFoundException('Organization member not found');
    }
    if (membership.userId === userId) {
      throw new BadRequestException('You cannot remove yourself from the organization');
    }

    await this.membershipsRepository.delete(memberId);
    return { success: true };
  }

  async listInvitations(userId: number, organizationId: number): Promise<OrganizationInvitation[]> {
    await this.assertMembership(userId, organizationId);
    const invitations = await this.invitationsRepository.find({
      where: { organizationId },
      relations: { invitedBy: true },
      order: { createdAt: 'DESC' },
    });
    for (const invitation of invitations) {
      this.stripPassword(invitation.invitedBy);
    }
    return invitations;
  }

  async createInvitation(
    userId: number,
    organizationId: number,
    email: string,
    role: OrganizationMemberRole,
  ): Promise<OrganizationInvitation> {
    await this.assertMembership(userId, organizationId, [OrganizationMemberRole.ADMIN]);
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await this.usersRepository.findOneBy({ email: normalizedEmail });
    if (existingUser) {
      const existingMember = await this.membershipsRepository.findOne({
        where: {
          organizationId,
          userId: existingUser.id,
        },
      });
      if (existingMember) {
        throw new ConflictException('This user is already a member of the organization');
      }
    }

    const pending = await this.invitationsRepository.findOne({
      where: {
        organizationId,
        email: normalizedEmail,
        status: OrganizationInvitationStatus.PENDING,
      },
    });
    if (pending) {
      throw new ConflictException('A pending invitation already exists for this email');
    }

    const invitation = this.invitationsRepository.create({
      organizationId,
      email: normalizedEmail,
      role,
      status: OrganizationInvitationStatus.PENDING,
      invitedById: userId,
    });
    return this.invitationsRepository.save(invitation);
  }

  async revokeInvitation(
    userId: number,
    organizationId: number,
    invitationId: number,
  ): Promise<OrganizationInvitation> {
    await this.assertMembership(userId, organizationId, [OrganizationMemberRole.ADMIN]);

    const invitation = await this.invitationsRepository.findOne({
      where: { id: invitationId, organizationId },
      relations: { invitedBy: true },
    });
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    if (invitation.status !== OrganizationInvitationStatus.PENDING) {
      throw new BadRequestException('Only pending invitations can be revoked');
    }

    invitation.status = OrganizationInvitationStatus.REVOKED;
    const saved = await this.invitationsRepository.save(invitation);
    this.stripPassword(saved.invitedBy);
    return saved;
  }

  async assertMembership(
    userId: number,
    organizationId: number,
    allowedRoles: OrganizationMemberRole[] = ALL_ORGANIZATION_MEMBER_ROLES,
  ): Promise<OrganizationMember> {
    const membership = await this.membershipsRepository.findOne({
      where: {
        userId,
        organizationId,
        role: In(allowedRoles),
      },
    });

    if (!membership) {
      throw new NotFoundException('Organization membership not found');
    }

    return membership;
  }
}

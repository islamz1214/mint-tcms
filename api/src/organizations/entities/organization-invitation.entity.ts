import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from './organization.entity';
import { User } from '../../users/entities/user.entity';
import type { OrganizationMemberRole } from './organization-member.entity';

const ORGANIZATION_MEMBER_ROLE_VALUES = ['admin', 'test_manager', 'tester', 'viewer'] as const;

export enum OrganizationInvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
}

@Entity('organization_invitations')
export class OrganizationInvitation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Organization, (organization) => organization.invitations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'organization_id' })
  organizationId: number;

  @Column()
  email: string;

  @Column({ type: 'enum', enum: ORGANIZATION_MEMBER_ROLE_VALUES, default: 'tester' })
  role: OrganizationMemberRole;

  @Column({
    type: 'enum',
    enum: OrganizationInvitationStatus,
    default: OrganizationInvitationStatus.PENDING,
  })
  status: OrganizationInvitationStatus;

  @ManyToOne(() => User, (user) => user.sentOrganizationInvitations, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'invited_by_id' })
  invitedBy: User | null;

  @Column({ name: 'invited_by_id', nullable: true })
  invitedById: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

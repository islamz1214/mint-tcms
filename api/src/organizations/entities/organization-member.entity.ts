import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from './organization.entity';
import { User } from '../../users/entities/user.entity';

export enum OrganizationMemberRole {
  ADMIN = 'admin',
  TEST_MANAGER = 'test_manager',
  TESTER = 'tester',
  VIEWER = 'viewer',
}

export const ALL_ORGANIZATION_MEMBER_ROLES = Object.values(OrganizationMemberRole);

@Entity('organization_members')
@Unique(['userId', 'organizationId'])
export class OrganizationMember {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Organization, (organization) => organization.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'organization_id' })
  organizationId: number;

  @ManyToOne(() => User, (user) => user.organizationMemberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ type: 'enum', enum: OrganizationMemberRole, default: OrganizationMemberRole.TEST_MANAGER })
  role: OrganizationMemberRole;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  UpdateDateColumn,
} from 'typeorm';
import { OrganizationMember } from '../../organizations/entities/organization-member.entity';
import { OrganizationInvitation } from '../../organizations/entities/organization-invitation.entity';

export enum UserRole {
  ADMIN = 'admin',
  TEST_MANAGER = 'test_manager',
  TESTER = 'tester',
  VIEWER = 'viewer',
}

export const ALL_USER_ROLES = [
  UserRole.ADMIN,
  UserRole.TEST_MANAGER,
  UserRole.TESTER,
  UserRole.VIEWER,
] as const;

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.TEST_MANAGER })
  role: UserRole;

  @OneToMany(() => OrganizationMember, (membership) => membership.user)
  organizationMemberships: OrganizationMember[];

  @OneToMany(() => OrganizationInvitation, (invitation) => invitation.invitedBy)
  sentOrganizationInvitations: OrganizationInvitation[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

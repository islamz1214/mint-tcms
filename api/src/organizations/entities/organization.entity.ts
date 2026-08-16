import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrganizationMember } from './organization-member.entity';
import { Project } from '../../projects/entities/project.entity';
import { OrganizationInvitation } from './organization-invitation.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @OneToMany(() => OrganizationMember, (member) => member.organization)
  members: OrganizationMember[];

  @OneToMany(() => Project, (project) => project.organization)
  projects: Project[];

  @OneToMany(() => OrganizationInvitation, (invitation) => invitation.organization)
  invitations: OrganizationInvitation[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

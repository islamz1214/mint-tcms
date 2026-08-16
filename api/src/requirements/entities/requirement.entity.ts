import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { TestCase } from '../../test-cases/entities/test-case.entity';

export enum RequirementStatus {
  DRAFT = 'draft',
  READY = 'ready',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
}

export enum RequirementPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

@Entity('requirements')
@Index(['projectId', 'key'], { unique: true })
export class Requirement {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  key!: string;

  @Column()
  title!: string;

  @Column({ nullable: true, type: 'text' })
  description!: string | null;

  @Column({ type: 'enum', enum: RequirementStatus, default: RequirementStatus.DRAFT })
  status!: RequirementStatus;

  @Column({ type: 'enum', enum: RequirementPriority, default: RequirementPriority.MEDIUM })
  priority!: RequirementPriority;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @Column({ name: 'project_id' })
  projectId!: number;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'owner_id' })
  owner!: User | null;

  @Column({ name: 'owner_id', nullable: true })
  ownerId!: number | null;

  @Column({ name: 'external_system', type: 'varchar', nullable: true })
  externalSystem!: string | null;

  @Column({ name: 'external_id', type: 'varchar', nullable: true })
  externalId!: string | null;

  @Column({ name: 'external_url', nullable: true, type: 'text' })
  externalUrl!: string | null;

  @ManyToMany(() => TestCase)
  @JoinTable({
    name: 'requirement_test_cases',
    joinColumn: { name: 'requirement_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'test_case_id', referencedColumnName: 'id' },
  })
  testCases!: TestCase[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

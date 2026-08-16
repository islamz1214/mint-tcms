import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { TestCase } from '../../test-cases/entities/test-case.entity';

export enum TestPlanType {
  RELEASE = 'release',
  SPRINT = 'sprint',
  MILESTONE = 'milestone',
}

export enum TestPlanStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  CLOSED = 'closed',
}

@Entity('test_plans')
export class TestPlan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string | null;

  @Column({ name: 'cycle_label', nullable: true, type: 'varchar' })
  cycleLabel: string | null;

  @Column({ type: 'enum', enum: TestPlanType })
  type: TestPlanType;

  @Column({ type: 'enum', enum: TestPlanStatus, default: TestPlanStatus.DRAFT })
  status: TestPlanStatus;

  @Column({ name: 'start_date', nullable: true, type: 'timestamp' })
  startDate: Date | null;

  @Column({ name: 'end_date', nullable: true, type: 'timestamp' })
  endDate: Date | null;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'project_id' })
  projectId: number;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User | null;

  @Column({ name: 'created_by', nullable: true })
  createdById: number | null;

  @ManyToMany(() => TestCase)
  @JoinTable({
    name: 'test_plan_test_cases',
    joinColumn: { name: 'test_plan_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'test_case_id', referencedColumnName: 'id' },
  })
  testCases: TestCase[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

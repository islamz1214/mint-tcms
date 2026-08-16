import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { TestSuite } from '../../test-suites/entities/test-suite.entity';
import { Precondition } from '../../preconditions/entities/precondition.entity';

export enum TestCaseStatus {
  ACTIVE = 'active',
  DRAFT = 'draft',
  ARCHIVED = 'archived',
}

export enum TestCasePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

@Entity('test_cases')
@Index(['projectId', 'key'], { unique: true })
export class TestCase {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', nullable: true })
  key: string | null;

  @Column()
  title: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ nullable: true, type: 'text' })
  precondition: string;

  @ManyToOne(() => Precondition, (preconditionRef) => preconditionRef.testCases, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'precondition_id' })
  preconditionRef: Precondition | null;

  @Column({ name: 'precondition_id', type: 'int', nullable: true })
  preconditionId: number | null;

  @Column({ nullable: true, type: 'text' })
  steps: string;

  @Column({ nullable: true, type: 'text' })
  expectedResult: string;

  @Column({ type: 'enum', enum: TestCaseStatus, default: TestCaseStatus.DRAFT })
  status: TestCaseStatus;

  @Column({ type: 'enum', enum: TestCasePriority, default: TestCasePriority.MEDIUM })
  priority: TestCasePriority;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'project_id' })
  projectId: number;

  @ManyToOne(() => TestSuite, (suite) => suite.testCases, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'test_suite_id' })
  testSuite: TestSuite;

  @Column({ name: 'test_suite_id', type: 'int', nullable: true })
  testSuiteId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by', nullable: true })
  createdById: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

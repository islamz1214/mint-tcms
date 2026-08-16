import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TestCasePriority, TestCaseStatus } from './test-case.entity';
import { TestCase } from './test-case.entity';
import { User } from '../../users/entities/user.entity';

@Entity('test_case_revisions')
export class TestCaseRevision {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'test_case_id' })
  testCaseId: number;

  @ManyToOne(() => TestCase, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'test_case_id' })
  testCase: TestCase;

  @Column()
  version: number;

  @Column()
  title: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ nullable: true, type: 'text' })
  precondition: string;

  @Column({ name: 'precondition_id', type: 'int', nullable: true })
  preconditionId: number | null;

  @Column({ nullable: true, type: 'text' })
  steps: string;

  @Column({ name: 'expected_result', nullable: true, type: 'text' })
  expectedResult: string;

  @Column({ type: 'enum', enum: TestCaseStatus })
  status: TestCaseStatus;

  @Column({ type: 'enum', enum: TestCasePriority })
  priority: TestCasePriority;

  @Column({ name: 'test_suite_id', type: 'int', nullable: true })
  testSuiteId: number | null;

  @Column({ name: 'changed_by', nullable: true })
  changedById: number;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'changed_by' })
  changedBy: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
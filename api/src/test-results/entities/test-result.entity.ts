import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { TestRun } from '../../test-runs/entities/test-run.entity';
import { TestCase } from '../../test-cases/entities/test-case.entity';
import { User } from '../../users/entities/user.entity';
import { Defect } from '../../defects/entities/defect.entity';
import { FileAttachment } from '../../attachments/entities/file-attachment.entity';

export enum TestResultStatus {
  PENDING = 'pending',
  PASSED = 'passed',
  FAILED = 'failed',
  BLOCKED = 'blocked',
  SKIPPED = 'skipped',
}

@Entity('test_results')
export class TestResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: TestResultStatus, default: TestResultStatus.PENDING })
  status: TestResultStatus;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @ManyToOne(() => TestRun, (run) => run.results, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'test_run_id' })
  testRun: TestRun;

  @Column({ name: 'test_run_id' })
  testRunId: number;

  @ManyToOne(() => TestCase, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'test_case_id' })
  testCase: TestCase;

  @Column({ name: 'test_case_id' })
  testCaseId: number;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'executed_by' })
  executedBy: User;

  @Column({ name: 'executed_by', nullable: true })
  executedById: number;

  @ManyToMany(() => Defect, (defect) => defect.results)
  defects: Defect[];

  @OneToMany(() => FileAttachment, (attachment) => attachment.testResult)
  attachments: FileAttachment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

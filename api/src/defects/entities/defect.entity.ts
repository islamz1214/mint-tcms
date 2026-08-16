import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { TestResult } from '../../test-results/entities/test-result.entity';
import { User } from '../../users/entities/user.entity';

export enum DefectStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum DefectSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum DefectPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum DefectSourceType {
  INTERNAL = 'internal',
  EXTERNAL = 'external',
}

@Entity('defects')
export class Defect {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ nullable: true, type: 'text' })
  description: string | null;

  @Column({ type: 'enum', enum: DefectStatus, default: DefectStatus.OPEN })
  status: DefectStatus;

  @Column({ type: 'enum', enum: DefectSeverity, default: DefectSeverity.MEDIUM })
  severity: DefectSeverity;

  @Column({ type: 'enum', enum: DefectPriority, default: DefectPriority.MEDIUM })
  priority: DefectPriority;

  @Column({ name: 'expected_result', nullable: true, type: 'text' })
  expectedResult: string | null;

  @Column({ name: 'actual_result', nullable: true, type: 'text' })
  actualResult: string | null;

  @Column({ nullable: true, type: 'varchar', length: 200 })
  environment: string | null;

  @Column({ nullable: true, type: 'varchar', length: 100 })
  component: string | null;

  @Column({ name: 'source_type', type: 'enum', enum: DefectSourceType, default: DefectSourceType.INTERNAL })
  sourceType: DefectSourceType;

  @Column({ name: 'external_key', nullable: true, type: 'varchar' })
  externalKey: string | null;

  @Column({ name: 'external_url', nullable: true, type: 'text' })
  externalUrl: string | null;

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

  @ManyToMany(() => TestResult, (result) => result.defects)
  @JoinTable({
    name: 'defect_test_results',
    joinColumn: { name: 'defect_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'test_result_id', referencedColumnName: 'id' },
  })
  results: TestResult[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
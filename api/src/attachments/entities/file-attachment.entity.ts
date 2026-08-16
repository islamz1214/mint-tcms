import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TestResult } from '../../test-results/entities/test-result.entity';
import { User } from '../../users/entities/user.entity';

@Entity('file_attachments')
export class FileAttachment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'original_name' })
  originalName: string;

  @Column({ name: 'mime_type' })
  mimeType: string;

  @Column()
  size: number;

  @Column({ name: 'storage_key' })
  storageKey: string;

  @ManyToOne(() => TestResult, (result) => result.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'test_result_id' })
  testResult: TestResult;

  @Column({ name: 'test_result_id' })
  testResultId: number;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy: User | null;

  @Column({ name: 'uploaded_by', nullable: true })
  uploadedById: number | null;

  @CreateDateColumn()
  createdAt: Date;
}

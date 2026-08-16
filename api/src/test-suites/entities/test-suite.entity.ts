import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { TestCase } from '../../test-cases/entities/test-case.entity';

@Entity('test_suites')
export class TestSuite {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'project_id' })
  projectId: number;

  @ManyToOne(() => TestSuite, (suite) => suite.children, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'parent_id' })
  parent: TestSuite;

  @Column({ name: 'parent_id', nullable: true })
  parentId: number | null;

  @OneToMany(() => TestSuite, (suite) => suite.parent)
  children: TestSuite[];

  @OneToMany(() => TestCase, (tc) => tc.testSuite)
  testCases: TestCase[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

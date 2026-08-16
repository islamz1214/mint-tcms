import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestRunsService } from './test-runs.service';
import { TestRunsController } from './test-runs.controller';
import { TestRun } from './entities/test-run.entity';
import { TestResult } from '../test-results/entities/test-result.entity';
import { ProjectsModule } from '../projects/projects.module';
import { TestCasesModule } from '../test-cases/test-cases.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TestRun, TestResult]),
    ProjectsModule,
    TestCasesModule,
  ],
  controllers: [TestRunsController],
  providers: [TestRunsService],
  exports: [TestRunsService],
})
export class TestRunsModule {}

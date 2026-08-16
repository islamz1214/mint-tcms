import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestCasesService } from './test-cases.service';
import { TestCasesController } from './test-cases.controller';
import { TestCase } from './entities/test-case.entity';
import { ProjectsModule } from '../projects/projects.module';
import { TestSuite } from '../test-suites/entities/test-suite.entity';
import { TestCaseRevision } from './entities/test-case-revision.entity';
import { Precondition } from '../preconditions/entities/precondition.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TestCase, TestSuite, TestCaseRevision, Precondition]),
    ProjectsModule,
  ],
  controllers: [TestCasesController],
  providers: [TestCasesService],
  exports: [TestCasesService],
})
export class TestCasesModule {}

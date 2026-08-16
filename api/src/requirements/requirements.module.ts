import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequirementsService } from './requirements.service';
import { RequirementsController } from './requirements.controller';
import { Requirement } from './entities/requirement.entity';
import { ProjectsModule } from '../projects/projects.module';
import { TestCase } from '../test-cases/entities/test-case.entity';
import { TestResult } from '../test-results/entities/test-result.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Requirement, TestCase, TestResult]), ProjectsModule],
  controllers: [RequirementsController],
  providers: [RequirementsService],
  exports: [RequirementsService],
})
export class RequirementsModule {}

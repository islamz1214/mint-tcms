import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsModule } from '../projects/projects.module';
import { TestCase } from '../test-cases/entities/test-case.entity';
import { TestPlan } from './entities/test-plan.entity';
import { TestPlansController } from './test-plans.controller';
import { TestPlansService } from './test-plans.service';

@Module({
  imports: [TypeOrmModule.forFeature([TestPlan, TestCase]), ProjectsModule],
  controllers: [TestPlansController],
  providers: [TestPlansService],
  exports: [TestPlansService],
})
export class TestPlansModule {}

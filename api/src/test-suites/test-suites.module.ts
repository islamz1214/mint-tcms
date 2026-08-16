import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestSuitesService } from './test-suites.service';
import { TestSuitesController } from './test-suites.controller';
import { TestSuite } from './entities/test-suite.entity';
import { TestCase } from '../test-cases/entities/test-case.entity';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [TypeOrmModule.forFeature([TestSuite, TestCase]), ProjectsModule],
  controllers: [TestSuitesController],
  providers: [TestSuitesService],
  exports: [TestSuitesService],
})
export class TestSuitesModule {}

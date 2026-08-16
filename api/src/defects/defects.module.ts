import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DefectsController } from './defects.controller';
import { DefectsService } from './defects.service';
import { Defect } from './entities/defect.entity';
import { ProjectsModule } from '../projects/projects.module';
import { TestResult } from '../test-results/entities/test-result.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Defect, TestResult]), ProjectsModule],
  controllers: [DefectsController],
  providers: [DefectsService],
  exports: [DefectsService],
})
export class DefectsModule {}
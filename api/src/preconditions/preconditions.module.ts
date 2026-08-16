import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PreconditionsController } from './preconditions.controller';
import { PreconditionsService } from './preconditions.service';
import { Precondition } from './entities/precondition.entity';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [TypeOrmModule.forFeature([Precondition]), ProjectsModule],
  controllers: [PreconditionsController],
  providers: [PreconditionsService],
  exports: [PreconditionsService],
})
export class PreconditionsModule {}

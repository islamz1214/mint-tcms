import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { FileAttachment } from './entities/file-attachment.entity';
import { AttachmentsService } from './attachments.service';
import { AttachmentsController } from './attachments.controller';
import { LocalStorageService } from './local-storage.service';
import { STORAGE_SERVICE } from './storage.interface';
import { TestResult } from '../test-results/entities/test-result.entity';
import { TestRun } from '../test-runs/entities/test-run.entity';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    ConfigModule,
    ProjectsModule,
    TypeOrmModule.forFeature([FileAttachment, TestResult, TestRun]),
  ],
  controllers: [AttachmentsController],
  providers: [
    AttachmentsService,
    // To migrate to S3: replace LocalStorageService with S3StorageService here
    { provide: STORAGE_SERVICE, useClass: LocalStorageService },
  ],
})
export class AttachmentsModule {}

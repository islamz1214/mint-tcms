import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ALL_USER_ROLES, UserRole } from '../users/entities/user.entity';
import { AttachmentsService } from './attachments.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ALL_USER_ROLES)
@Controller('projects/:projectId/test-runs/:runId/results/:resultId/attachments')
export class AttachmentsController {
  constructor(private readonly service: AttachmentsService) {}

  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER, UserRole.TESTER)
  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  upload(
    @Param('projectId') projectId: string,
    @Param('runId') runId: string,
    @Param('resultId') resultId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    return this.service.upload(+projectId, +runId, +resultId, file, req.user.id);
  }

  @Get(':id/download')
  async download(
    @Param('projectId') projectId: string,
    @Param('runId') runId: string,
    @Param('resultId') resultId: string,
    @Param('id') id: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const attachment = await this.service.findOne(+id, +resultId, +runId, +projectId, req.user.id);
    const localPath = this.service.resolveLocalPath(attachment);

    if (!localPath) {
      // Future: redirect to pre-signed S3 URL
      res.status(501).json({ message: 'Remote storage download not implemented' });
      return;
    }

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.originalName)}"`);
    res.setHeader('Content-Type', attachment.mimeType);
    res.sendFile(localPath);
  }

  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER, UserRole.TESTER)
  @Delete(':id')
  remove(
    @Param('projectId') projectId: string,
    @Param('runId') runId: string,
    @Param('resultId') resultId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.service.remove(+id, +resultId, +runId, +projectId, req.user.id);
  }
}

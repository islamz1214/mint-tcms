import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import type { IStorageService, StoredFile } from './storage.interface';

/**
 * Local-disk implementation of IStorageService.
 *
 * To migrate to S3:
 *   1. Create S3StorageService implementing IStorageService
 *   2. In AttachmentsModule, replace { provide: STORAGE_SERVICE, useClass: LocalStorageService }
 *      with { provide: STORAGE_SERVICE, useClass: S3StorageService }
 *   3. resolveLocalPath() should return null in S3StorageService (the controller will redirect instead)
 */
@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly uploadDir: string;

  constructor(config: ConfigService) {
    this.uploadDir = config.get<string>('UPLOAD_DIR') || path.join(process.cwd(), 'uploads');
    fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  async save(file: Express.Multer.File, folder: string): Promise<StoredFile> {
    const dir = path.join(this.uploadDir, folder);
    fs.mkdirSync(dir, { recursive: true });

    const ext = path.extname(file.originalname);
    const filename = `${randomUUID()}${ext}`;
    const fullPath = path.join(dir, filename);

    fs.writeFileSync(fullPath, file.buffer);

    return { key: path.posix.join(folder, filename) };
  }

  async delete(key: string): Promise<void> {
    const fullPath = path.join(this.uploadDir, ...key.split('/'));
    try {
      fs.unlinkSync(fullPath);
    } catch {
      // File already gone — not an error
    }
  }

  resolveLocalPath(key: string): string | null {
    return path.join(this.uploadDir, ...key.split('/'));
  }
}

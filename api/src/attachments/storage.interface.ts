/**
 * Storage abstraction — swap LocalStorageService for S3StorageService
 * without changing any other code.
 */
export interface StoredFile {
  /** Opaque key used to retrieve or delete the file later */
  key: string;
}

export interface IStorageService {
  /**
   * Persist a file and return its storage key.
   * @param file  The uploaded file (buffer in memory)
   * @param folder  Logical folder, e.g. "attachments/42" (result id)
   */
  save(file: Express.Multer.File, folder: string): Promise<StoredFile>;

  /** Delete a previously stored file by its key */
  delete(key: string): Promise<void>;

  /**
   * Resolve the absolute local path for streaming.
   * Returns null when the storage backend is remote (e.g. S3).
   */
  resolveLocalPath(key: string): string | null;
}

export const STORAGE_SERVICE = 'STORAGE_SERVICE';

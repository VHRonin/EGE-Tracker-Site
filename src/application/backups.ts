import { BackupRepository } from '../data/backupRepository';
import { BackupService } from './backupService';
import { database } from './storage';
import { decodeScreenshot } from './images';
export const backups = new BackupService(
  new BackupRepository(database),
  decodeScreenshot,
);

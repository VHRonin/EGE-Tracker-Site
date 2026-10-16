import { BackupRepository } from '../data/backupRepository';
import { backupLimits, prepareBackup, serializeBackup } from '../domain/backup';
import type { PreparedBackup } from '../domain/backup';
import type { Attachment } from '../domain/entities';
import { ValidationError } from '../domain/validation';

export interface BackupPreview {
  token: string;
  exportedAt: string;
  fileBytes: number;
  imageBytes: number;
  subjects: number;
  exercises: number;
  subtopics: number;
  attempts: number;
  attachments: number;
}

export class BackupService {
  private prepared: { token: string; backup: PreparedBackup } | null = null;
  private revision = 0;
  private mutating = false;
  constructor(
    private repository: BackupRepository,
    private decodeImage?: (image: Attachment) => Promise<void>,
  ) {}

  async export() {
    return serializeBackup(await this.repository.snapshot());
  }

  async preview(contents: string, fileBytes?: number): Promise<BackupPreview> {
    const revision = ++this.revision;
    this.prepared = null;
    const backup = await prepareBackup(contents, fileBytes);
    if (this.decodeImage)
      for (const image of backup.data.attachments)
        await this.decodeImage(image);
    if (revision !== this.revision)
      throw new ValidationError(
        'Выбор файла изменился. Проверьте новую резервную копию.',
      );
    const token = crypto.randomUUID();
    this.prepared = { token, backup };
    return {
      token,
      exportedAt: backup.exportedAt,
      fileBytes: backup.fileBytes,
      imageBytes: backup.imageBytes,
      subjects: backup.data.subjects.length,
      exercises: backup.data.exercises.length,
      subtopics: backup.data.subtopics.length,
      attempts: backup.data.attempts.length,
      attachments: backup.data.attachments.length,
    };
  }

  async previewFile(file: File) {
    this.cancel();
    const revision = this.revision;
    if (file.size > backupLimits.fileBytes) {
      this.cancel();
      throw new ValidationError('Файл больше 256 МиБ.');
    }
    const contents = await file.text();
    if (revision !== this.revision)
      throw new ValidationError('Выбор файла отменён.');
    return this.preview(contents, file.size);
  }

  cancel() {
    this.revision++;
    this.prepared = null;
  }

  async restore(token: string) {
    if (this.mutating)
      throw new ValidationError('Дождитесь завершения операции с данными.');
    if (!this.prepared || this.prepared.token !== token)
      throw new ValidationError(
        'Сначала выберите и проверьте файл резервной копии.',
      );
    const prepared = this.prepared;
    this.mutating = true;
    try {
      await this.repository.replace(prepared.backup.data);
      this.cancel();
    } finally {
      this.mutating = false;
    }
  }

  async reset() {
    if (this.mutating)
      throw new ValidationError('Дождитесь завершения операции с данными.');
    this.mutating = true;
    try {
      await this.repository.reset();
      this.cancel();
    } finally {
      this.mutating = false;
    }
  }
}

// @vitest-environment node
import 'fake-indexeddb/auto';
import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import { TrackerDatabase } from './database';
import { TrackerRepository } from './repository';
import { BackupRepository } from './backupRepository';
import { BackupService } from '../application/backupService';
import { backupLimits, prepareBackup, serializeBackup } from '../domain/backup';
import type { BackupFile, DataSnapshot } from '../domain/backup';

let db: TrackerDatabase;
let repository: TrackerRepository;
let backupRepository: BackupRepository;
let service: BackupService;
let snapshot: DataSnapshot;
let contents: string;

beforeEach(async () => {
  db = new TrackerDatabase(`backup-${crypto.randomUUID()}`);
  await db.open();
  repository = new TrackerRepository(db);
  backupRepository = new BackupRepository(db);
  service = new BackupService(backupRepository);
  const exercise = (await db.exercises.toArray())[0]!;
  const topic = await repository.saveSubtopic(exercise.id, 'Тема');
  const blob = new Blob(
    [
      Uint8Array.from(
        atob(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        ),
        (character) => character.charCodeAt(0),
      ),
    ],
    { type: 'image/png' },
  );
  await repository.saveAttempt(
    {
      exerciseId: exercise.id,
      subtopicId: topic.id,
      isCorrect: true,
      comment: '<b>Текст</b>',
      myAnswer: ' 001 ',
    },
    { filename: 'пример.png', blob, size: blob.size, mimeType: blob.type },
  );
  await repository.saveAttempt({ exerciseId: exercise.id, isCorrect: false });
  snapshot = await backupRepository.snapshot();
  contents = await serializeBackup(snapshot, '2026-10-15T12:00:00Z');
});
afterEach(async () => {
  await db.delete();
});

function modified(change: (backup: BackupFile) => void) {
  const backup = JSON.parse(contents) as BackupFile;
  change(backup);
  return JSON.stringify(backup);
}

describe('Полная резервная копия', () => {
  it('детерминированно сериализует все таблицы и base64 без потери текста', async () => {
    expect(
      await serializeBackup(
        { ...snapshot, exercises: [...snapshot.exercises].reverse() },
        '2026-10-15T12:00:00Z',
      ),
    ).toBe(contents);
    const backup = JSON.parse(contents) as BackupFile;
    expect(backup.subjects).toHaveLength(3);
    expect(backup.exercises).toHaveLength(74);
    expect(backup.attachments[0]?.base64).toBeTruthy();
    expect(contents).not.toContain('"blob"');
    expect(backup.attempts.find((item) => item.myAnswer)?.myAnswer).toBe(
      ' 001 ',
    );
  });
  it('предпросмотр ничего не меняет; экспорт → сброс → импорт восстанавливает Blob и решения без подтемы', async () => {
    const preview = await service.preview(contents);
    expect(await db.attempts.count()).toBe(2);
    expect(preview).toMatchObject({
      subjects: 3,
      exercises: 74,
      subtopics: 1,
      attempts: 2,
      attachments: 1,
    });
    await service.reset();
    expect(await db.attempts.count()).toBe(0);
    const checked = await service.preview(contents);
    await service.restore(checked.token);
    const restored = await backupRepository.snapshot();
    expect(await serializeBackup(restored, '2026-10-15T12:00:00Z')).toBe(
      contents,
    );
    expect(
      restored.attempts.some((attempt) => attempt.subtopicId === null),
    ).toBe(true);
    expect(await restored.attachments[0]!.blob.arrayBuffer()).toEqual(
      await snapshot.attachments[0]!.blob.arrayBuffer(),
    );
    db.close();
    await db.open();
    expect(await db.attempts.count()).toBe(2);
  });
  it('полная замена убирает старые записи, не объединяя копии', async () => {
    const extra = await repository.saveExercise(
      snapshot.subjects[0]!.id,
      99,
      'Лишний номер',
    );
    const preview = await service.preview(contents);
    await service.restore(preview.token);
    expect(await db.exercises.get(extra.id)).toBeUndefined();
    expect(await db.exercises.count()).toBe(74);
  });
  it('откатывает очищение всех таблиц при ошибке записи изображения', async () => {
    const preview = await service.preview(contents);
    db.attachments.hook('creating', () => {
      throw new DOMException('Full', 'QuotaExceededError');
    });
    await expect(service.restore(preview.token)).rejects.toThrow();
    expect(
      await serializeBackup(
        await backupRepository.snapshot(),
        '2026-10-15T12:00:00Z',
      ),
    ).toBe(contents);
  });
  it('откатывает сброс, если стартовый каталог не может быть записан', async () => {
    db.exercises.hook('creating', () => {
      throw new Error('Write failure');
    });
    await expect(service.reset()).rejects.toThrow();
    expect(
      await serializeBackup(
        await backupRepository.snapshot(),
        '2026-10-15T12:00:00Z',
      ),
    ).toBe(contents);
  });
  it('отмена и неверный токен не разрешают замену данных', async () => {
    const preview = await service.preview(contents);
    service.cancel();
    await expect(service.restore(preview.token)).rejects.toThrow('Сначала');
    await expect(service.restore('invented')).rejects.toThrow();
    expect(await db.attempts.count()).toBe(2);
  });
  it('ошибка декодирования и отмена незавершённой проверки не меняют базу', async () => {
    const rejecting = new BackupService(backupRepository, async () => {
      throw new Error('Image decode failed');
    });
    await expect(rejecting.preview(contents)).rejects.toThrow('decode');
    const pending = service.preview(contents);
    service.cancel();
    await expect(pending).rejects.toThrow('изменился');
    expect(await db.attempts.count()).toBe(2);
  });
});

describe('Неверный импорт не повреждает базу', () => {
  it.each([
    [
      'неизвестная версия',
      (backup: BackupFile) => {
        Object.assign(backup, { schemaVersion: 99 });
      },
    ],
    [
      'отсутствующее поле',
      (backup: BackupFile) => {
        Reflect.deleteProperty(backup.attempts[0]!, 'isCorrect');
      },
    ],
    [
      'неверный тип результата',
      (backup: BackupFile) => {
        Object.assign(backup.attempts[0]!, { isCorrect: 'true' });
      },
    ],
    [
      'неверный UUID',
      (backup: BackupFile) => {
        backup.exercises[0]!.id = 'ex-1';
      },
    ],
    [
      'неверная дата',
      (backup: BackupFile) => {
        backup.attempts[0]!.solvedAt = '2026-02-30T12:00:00Z';
      },
    ],
    [
      'повторяющийся ID',
      (backup: BackupFile) => {
        backup.attempts.push(backup.attempts[0]!);
      },
    ],
    [
      'повторяющийся номер',
      (backup: BackupFile) => {
        backup.exercises.push({
          ...backup.exercises[0]!,
          id: crypto.randomUUID(),
        });
      },
    ],
    [
      'нет предмета',
      (backup: BackupFile) => {
        backup.exercises[0]!.subjectId = crypto.randomUUID();
      },
    ],
    [
      'нет номера у подтемы',
      (backup: BackupFile) => {
        backup.subtopics[0]!.exerciseId = crypto.randomUUID();
      },
    ],
    [
      'нет номера у решения',
      (backup: BackupFile) => {
        backup.attempts[0]!.exerciseId = crypto.randomUUID();
      },
    ],
    [
      'чужая подтема',
      (backup: BackupFile) => {
        backup.attempts[0]!.subtopicId = backup.subtopics[0]!.id;
        backup.attempts[0]!.exerciseId = backup.exercises.find(
          (exercise) => exercise.id !== backup.subtopics[0]!.exerciseId,
        )!.id;
      },
    ],
    [
      'нет решения у изображения',
      (backup: BackupFile) => {
        backup.attachments[0]!.attemptId = crypto.randomUUID();
      },
    ],
    [
      'размер изображения',
      (backup: BackupFile) => {
        backup.attachments[0]!.size += 1;
      },
    ],
    [
      'MIME',
      (backup: BackupFile) => {
        Object.assign(backup.attachments[0]!, { mimeType: 'text/html' });
      },
    ],
    [
      'base64',
      (backup: BackupFile) => {
        backup.attachments[0]!.base64 = '!!!!';
      },
    ],
    [
      'слишком длинный комментарий',
      (backup: BackupFile) => {
        backup.attempts[0]!.comment = 'x'.repeat(10_001);
      },
    ],
    [
      'неполный состав предметов',
      (backup: BackupFile) => {
        backup.subjects.pop();
      },
    ],
    [
      'лишние поля',
      (backup: BackupFile) => {
        Object.assign(backup, { execute: 'bad' });
      },
    ],
  ])('%s', async (_label, change) => {
    await expect(service.preview(modified(change))).rejects.toThrow();
    expect(
      await serializeBackup(
        await backupRepository.snapshot(),
        '2026-10-15T12:00:00Z',
      ),
    ).toBe(contents);
  });
  it('отклоняет повреждённый JSON и размер до чтения сущностей', async () => {
    await expect(prepareBackup('{')).rejects.toThrow('JSON');
    await expect(
      prepareBackup(contents, backupLimits.fileBytes + 1),
    ).rejects.toThrow('256');
    expect(await db.attempts.count()).toBe(2);
  });
});

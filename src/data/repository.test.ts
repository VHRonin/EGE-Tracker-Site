// @vitest-environment node
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TrackerDatabase, initialSubjects } from './database';
import { TrackerRepository } from './repository';
import type { ImageInput } from '../domain/entities';
import { uuid } from '../domain/validation';

let db: TrackerDatabase;
let repository: TrackerRepository;
let exerciseId: string;
let otherExerciseId: string;

function screenshot(): ImageInput {
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
  return {
    blob,
    mimeType: blob.type,
    size: blob.size,
    filename: 'решение.png',
  };
}

beforeEach(async () => {
  db = new TrackerDatabase(`test-${crypto.randomUUID()}`);
  repository = new TrackerRepository(db);
  await db.open();
  const exercises = await db.exercises.toArray();
  exerciseId = exercises[0]!.id;
  otherExerciseId = exercises[1]!.id;
});
afterEach(async () => {
  await db.delete();
});

describe('Схема и каталог', () => {
  it('создаёт три предмета со стабильными UUID и 74 номера с названиями один раз', async () => {
    expect(await db.subjects.count()).toBe(3);
    expect(await db.exercises.count()).toBe(74);
    for (const subject of await db.subjects.toArray())
      expect(uuid(subject.id)).toBe(subject.id);
    await repository.saveExercise(initialSubjects[0]!.id, 99, 'Мой номер');
    await repository.deleteExercise(exerciseId);
    db.close();
    await db.open();
    expect(await db.exercises.count()).toBe(74);
    expect(await db.exercises.get(exerciseId)).toBeUndefined();
    expect(
      (await repository.subjectPage('math'))?.exercises.some(
        (e) => e.title === 'Мой номер',
      ),
    ).toBe(true);
  });

  it('сохраняет уникальность номера внутри предмета и разрешает тот же номер в другом', async () => {
    const first = await repository.saveExercise(
      initialSubjects[0]!.id,
      99,
      'Новый номер',
    );
    await expect(
      repository.saveExercise(initialSubjects[0]!.id, 99, 'Дубликат'),
    ).rejects.toMatchObject({ name: 'ConstraintError' });
    await repository.saveExercise(initialSubjects[1]!.id, 99, 'Другой предмет');
    await repository.saveExercise(
      first.subjectId,
      98,
      'Переименованный',
      first.id,
    );
    expect(await db.exercises.get(first.id)).toMatchObject({
      number: 98,
      title: 'Переименованный',
      createdAt: first.createdAt,
    });
  });

  it('не принимает пустые названия, дробные номера и отсутствующие ссылки', async () => {
    await expect(
      repository.saveExercise(initialSubjects[0]!.id, 1.5, 'Название'),
    ).rejects.toThrow();
    await expect(repository.saveSubtopic(exerciseId, '  ')).rejects.toThrow(
      'Введите название',
    );
    await expect(
      repository.saveAttempt({
        exerciseId: crypto.randomUUID(),
        isCorrect: true,
      }),
    ).rejects.toThrow('Номер больше не существует');
    const topic = await repository.saveSubtopic(otherExerciseId, 'Чужая');
    await expect(
      repository.saveAttempt({
        exerciseId,
        subtopicId: topic.id,
        isCorrect: true,
      }),
    ).rejects.toThrow('другому номеру');
    expect(await db.attempts.count()).toBe(0);
  });
});

describe('Транзакции и история', () => {
  it('сохраняет запись только с результатом и Blob после закрытия и открытия базы', async () => {
    const attempt = await repository.saveAttempt(
      { exerciseId, isCorrect: true },
      screenshot(),
    );
    db.close();
    await db.open();
    expect(await db.attempts.get(attempt.id)).toMatchObject({
      isCorrect: true,
      subtopicId: null,
      description: null,
    });
    const image = await db.attachments
      .where('attemptId')
      .equals(attempt.id)
      .first();
    expect(image?.blob).toBeInstanceOf(Blob);
    expect(await image?.blob.arrayBuffer()).toEqual(
      await screenshot().blob.arrayBuffer(),
    );
  });

  it('переименовывает подтему, удаляет её и сохраняет решения и скриншоты', async () => {
    const topic = await repository.saveSubtopic(exerciseId, 'Подтема');
    const attempt = await repository.saveAttempt(
      { exerciseId, subtopicId: topic.id, isCorrect: false },
      screenshot(),
    );
    await repository.saveSubtopic(exerciseId, 'Новое название', topic.id);
    expect((await db.subtopics.get(topic.id))?.title).toBe('Новое название');
    await repository.deleteSubtopic(topic.id);
    expect(await db.attempts.get(attempt.id)).toMatchObject({
      subtopicId: null,
      isCorrect: false,
    });
    expect(await db.attachments.count()).toBe(1);
    expect(await db.subtopics.count()).toBe(0);
  });

  it('учитывает решения без подтемы вместе со связанными', async () => {
    const topic = await repository.saveSubtopic(exerciseId, 'Тема');
    await repository.saveAttempt({ exerciseId, isCorrect: true });
    await repository.saveAttempt({
      exerciseId,
      isCorrect: false,
      subtopicId: topic.id,
    });
    const exercise = await repository.requireExercise(exerciseId);
    const subject = await db.subjects.get(exercise.subjectId);
    const page = await repository.exercisePage(exerciseId, subject!.code);
    expect(page?.attempts).toHaveLength(2);
    expect(page?.attempts.filter((a) => a.subtopicId === null)).toHaveLength(1);
  });

  it('сортирует старые и одновременные записи детерминированно', async () => {
    await repository.saveAttempt({
      exerciseId,
      isCorrect: true,
      solvedAt: '2026-02-01T12:00:00Z',
    });
    await repository.addBatch(exerciseId, 2, 1, null, '2026-03-01T12:00:00Z');
    const exercise = await repository.requireExercise(exerciseId);
    const subject = await db.subjects.get(exercise.subjectId);
    const page = await repository.exercisePage(exerciseId, subject!.code);
    expect(page?.attempts.at(-1)?.solvedAt).toBe('2026-02-01T12:00:00.000Z');
    const ids = page!.attempts.slice(0, 3).map((a) => a.id);
    expect(ids).toEqual([...ids].sort().reverse());
  });

  it('обновляет запись, сохраняет вложение по умолчанию и удаляет его явно', async () => {
    const attempt = await repository.saveAttempt(
      { exerciseId, isCorrect: true },
      screenshot(),
    );
    await repository.saveAttempt(
      { exerciseId, isCorrect: false, comment: 'Ошибка' },
      undefined,
      attempt.id,
    );
    expect(await db.attachments.count()).toBe(1);
    expect((await db.attempts.get(attempt.id))?.createdAt).toBe(
      attempt.createdAt,
    );
    await repository.saveAttempt(
      { exerciseId, isCorrect: true },
      null,
      attempt.id,
    );
    expect(await db.attachments.count()).toBe(0);
    await repository.saveAttempt(
      { exerciseId, isCorrect: true },
      screenshot(),
      attempt.id,
    );
    await repository.deleteAttempt(attempt.id);
    expect(await db.attempts.count()).toBe(0);
    expect(await db.attachments.count()).toBe(0);
  });

  it('атомарно удаляет номер и зависимые записи, сохраняя другой номер', async () => {
    const topic = await repository.saveSubtopic(exerciseId, 'Тема');
    await repository.saveAttempt(
      { exerciseId, subtopicId: topic.id, isCorrect: true },
      screenshot(),
    );
    const keep = await repository.saveAttempt(
      { exerciseId: otherExerciseId, isCorrect: false },
      screenshot(),
    );
    await repository.deleteExercise(exerciseId);
    expect(await db.subtopics.count()).toBe(0);
    expect(await db.attempts.toArray()).toEqual([keep]);
    expect(await db.attachments.count()).toBe(1);
  });

  it('откатывает изменение решения и удаление старого вложения при ошибке нового', async () => {
    const attempt = await repository.saveAttempt(
      { exerciseId, isCorrect: true, comment: 'Исходное' },
      screenshot(),
    );
    const oldAttachment = await db.attachments.toArray();
    db.attachments.hook('creating', () => {
      throw new DOMException('Full', 'QuotaExceededError');
    });
    await expect(
      repository.saveAttempt(
        { exerciseId, isCorrect: false, comment: 'Новое' },
        screenshot(),
        attempt.id,
      ),
    ).rejects.toThrow();
    expect(await db.attempts.get(attempt.id)).toEqual(attempt);
    expect((await db.attachments.toArray()).map((a) => a.id)).toEqual(
      oldAttachment.map((a) => a.id),
    );
  });

  it('откатывает каскадное удаление при ошибке', async () => {
    const topic = await repository.saveSubtopic(exerciseId, 'Тема');
    const attempt = await repository.saveAttempt(
      { exerciseId, subtopicId: topic.id, isCorrect: true },
      screenshot(),
    );
    db.exercises.hook('deleting', () => {
      throw new Error('Simulated write failure');
    });
    await expect(repository.deleteExercise(exerciseId)).rejects.toThrow();
    expect(await db.attempts.get(attempt.id)).toEqual(attempt);
    expect(await db.attachments.count()).toBe(1);
    expect(await db.subtopics.get(topic.id)).toBeDefined();
  });

  it('создаёт пакет отдельными решениями и откатывает неполный пакет', async () => {
    const batch = await repository.addBatch(exerciseId, 2, 3);
    expect(batch).toHaveLength(5);
    expect(batch.filter((a) => a.isCorrect)).toHaveLength(2);
    expect(new Set(batch.map((a) => a.id)).size).toBe(5);
    expect(new Set(batch.map((a) => a.solvedAt)).size).toBe(1);
    let count = 0;
    db.attempts.hook('creating', () => {
      if (++count === 3) throw new Error('Simulated write failure');
    });
    await expect(repository.addBatch(exerciseId, 5, 0)).rejects.toThrow();
    expect(await db.attempts.count()).toBe(5);
  });

  it.each([
    [0, 0],
    [-1, 2],
    [1.2, 0],
    [101, 0],
    [NaN, 2],
  ])('отклоняет неверный пакет %s / %s', async (correct, incorrect) => {
    await expect(
      repository.addBatch(exerciseId, correct, incorrect),
    ).rejects.toThrow();
    expect(await db.attempts.count()).toBe(0);
  });

  it('отклоняет поддельное изображение, неправильный MIME и превышение размера до записи', async () => {
    const invalid = new Blob(['<script>alert(1)</script>'], {
      type: 'image/png',
    });
    await expect(
      repository.saveAttempt(
        { exerciseId, isCorrect: true },
        {
          filename: 'fake.png',
          blob: invalid,
          mimeType: invalid.type,
          size: invalid.size,
        },
      ),
    ).rejects.toThrow('Содержимое');
    await expect(
      repository.saveAttempt(
        { exerciseId, isCorrect: true },
        { ...screenshot(), mimeType: 'image/svg+xml' },
      ),
    ).rejects.toThrow('PNG');
    await expect(
      repository.saveAttempt(
        { exerciseId, isCorrect: true },
        { ...screenshot(), size: 10 * 1024 * 1024 + 1 },
      ),
    ).rejects.toThrow('10 МБ');
    expect(await db.attempts.count()).toBe(0);
  });
});

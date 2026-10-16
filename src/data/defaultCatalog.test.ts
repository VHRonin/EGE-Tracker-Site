// @vitest-environment node
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import suppliedTitles from '../../docs/default-exercise-titles.txt?raw';
import { afterEach, describe, expect, it } from 'vitest';
import { TrackerDatabase, initialSubjects } from './database';
import { initialExerciseTitles } from './defaultCatalog';
import { BackupRepository } from './backupRepository';
import type { Exercise, Subject } from '../domain/entities';

const databases: Dexie[] = [];
afterEach(async () => {
  const opened = databases.splice(0);
  for (const db of opened) db.close();
  for (const name of new Set(opened.map((db) => db.name)))
    await Dexie.delete(name);
});

function current(name = `catalog-${crypto.randomUUID()}`) {
  const db = new TrackerDatabase(name);
  databases.push(db);
  return db;
}
async function legacy(existing20 = false) {
  const db = new Dexie(`legacy-${crypto.randomUUID()}`);
  databases.push(db);
  db.version(1).stores({
    subjects: 'id, &code, sortOrder',
    exercises: 'id, subjectId, &[subjectId+number]',
    subtopics: 'id, exerciseId, [exerciseId+sortOrder]',
    attempts:
      'id, exerciseId, subtopicId, solvedAt, [exerciseId+solvedAt], [subtopicId+solvedAt]',
    attachments: 'id, &attemptId',
  });
  await db.open();
  // Imported backups may have different subject UUIDs from the initial catalog.
  const subjects = initialSubjects.map((subject) => ({
    ...subject,
    id: crypto.randomUUID(),
  }));
  const time = '2026-01-01T12:00:00.000Z';
  const records = subjects.flatMap((subject) =>
    [1, 2, 99].map((number) => ({
      id: crypto.randomUUID(),
      subjectId: subject.id,
      number,
      title: number === 2 ? 'Моё название' : `Задание №${number}`,
      createdAt: time,
      updatedAt: time,
    })),
  );
  if (existing20)
    records.push({
      id: crypto.randomUUID(),
      subjectId: subjects[0]!.id,
      number: 20,
      title: 'Мой двадцатый',
      createdAt: time,
      updatedAt: time,
    });
  await db.table('subjects').bulkAdd(subjects);
  await db.table('exercises').bulkAdd(records);
  const topic = {
    id: crypto.randomUUID(),
    exerciseId: records[0]!.id,
    title: 'Подтема',
    sortOrder: 0,
    createdAt: time,
    updatedAt: time,
  };
  const attempt = {
    id: crypto.randomUUID(),
    exerciseId: records[0]!.id,
    subtopicId: topic.id,
    isCorrect: true,
    solvedAt: time,
    description: null,
    myAnswer: null,
    correctAnswer: null,
    comment: 'Моя история',
    createdAt: time,
    updatedAt: time,
  };
  const attachment = {
    id: crypto.randomUUID(),
    attemptId: attempt.id,
    filename: 'image.png',
    mimeType: 'image/png',
    size: 3,
    blob: new Blob(['png'], { type: 'image/png' }),
    createdAt: time,
  };
  await db.table('subtopics').add(topic);
  await db.table('attempts').add(attempt);
  await db.table('attachments').add(attachment);
  db.close();
  return { db, subjects, records, topic, attempt, attachment };
}

describe('Названия стартового каталога', () => {
  it('точно следует всем 74 строкам пользовательского файла и применяется после сброса', async () => {
    const source = suppliedTitles;
    const codes = {
      Математика: 'math',
      'Русский язык': 'russian',
      Информатика: 'informatics',
    } as const;
    let code: keyof typeof initialExerciseTitles = 'math';
    let count = 0;
    for (const line of source
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean)) {
      if (line in codes) {
        code = codes[line as keyof typeof codes];
        continue;
      }
      const match = /^Задание (\d+) - (.+)$/.exec(line)!;
      expect(initialExerciseTitles[code][Number(match[1]) - 1]).toBe(match[2]);
      count++;
    }
    expect(count).toBe(74);
    const db = current();
    await db.open();
    async function assertCatalog() {
      expect(await db.exercises.count()).toBe(74);
      for (const subject of await db.subjects.toArray()) {
        const records = (
          await db.exercises.where('subjectId').equals(subject.id).toArray()
        ).sort((a, b) => a.number - b.number);
        expect(records.map((item) => item.title)).toEqual(
          initialExerciseTitles[subject.code],
        );
      }
    }
    await assertCatalog();
    await db.exercises.clear();
    await new BackupRepository(db).reset();
    await assertCatalog();
  });

  it('обновляет v1 транзакционно, сохраняя UUID, пользовательские названия, историю, подтемы и изображения', async () => {
    const old = await legacy();
    const db = current(old.db.name);
    await db.open();
    expect(db.verno).toBe(2);
    const subjects = await db.subjects.toArray();
    expect(subjects).toHaveLength(3);
    for (const before of old.records) {
      const subject = old.subjects.find(
        (subject) => subject.id === before.subjectId,
      )!;
      const after = await db.exercises.get(before.id);
      expect(after).toMatchObject({
        ...before,
        updatedAt: before.number === 1 ? expect.any(String) : before.updatedAt,
        title:
          before.number === 1
            ? initialExerciseTitles[subject.code][0]
            : before.title,
      });
    }
    expect(await db.attempts.toArray()).toEqual([old.attempt]);
    expect(await db.subtopics.toArray()).toEqual([old.topic]);
    const image = (await db.attachments.toArray())[0]!;
    expect({ ...image, blob: undefined }).toEqual({
      ...old.attachment,
      blob: undefined,
    });
    expect(await image.blob.text()).toBe('png');
    expect(
      await db.exercises
        .where('[subjectId+number]')
        .equals([old.subjects[0]!.id, 3])
        .count(),
    ).toBe(0);
    const twenty = await db.exercises
      .where('[subjectId+number]')
      .equals([old.subjects[0]!.id, 20])
      .first();
    expect(twenty?.title).toBe('Свойства чисел.');
    await db.exercises.delete(twenty!.id);
    db.close();
    await db.open();
    expect(await db.exercises.get(twenty!.id)).toBeUndefined();
  });

  it('не заменяет и не дублирует уже существующий номер 20', async () => {
    const old = await legacy(true);
    const db = current(old.db.name);
    await db.open();
    const twenty = await db.exercises
      .where('[subjectId+number]')
      .equals([old.subjects[0]!.id, 20])
      .toArray();
    expect(twenty).toEqual(old.records.filter((item) => item.number === 20));
    expect(await db.exercises.count()).toBe(old.records.length);
  });

  it('после импорта сохраняет точные названия из копии и не запускает миграцию повторно', async () => {
    const db = current();
    await db.open();
    const subject: Subject = {
      ...initialSubjects[0]!,
      id: crypto.randomUUID(),
    };
    const exercise: Exercise = {
      id: crypto.randomUUID(),
      subjectId: subject.id,
      number: 1,
      title: 'Задание №1',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    await new BackupRepository(db).replace({
      subjects: [subject],
      exercises: [exercise],
      subtopics: [],
      attempts: [],
      attachments: [],
    });
    db.close();
    await db.open();
    expect(await db.exercises.toArray()).toEqual([exercise]);
  });
});

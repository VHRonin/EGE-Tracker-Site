import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { homeBackup } from '../fixtures/homeBackup';
import type { BackupFile } from '../../src/domain/backup';

test('обновление старого каталога сохраняет историю, пользовательские названия и JSON v1', async ({
  page,
}) => {
  const old = homeBackup();
  old.exercises[0]!.title = 'Задание №1';
  old.exercises[2]!.title = 'Задание №3';
  // Same-origin document without application code, so the legacy database exists before boot.
  await page.goto('/favicon.svg');
  await page.evaluate(async (data) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('ege-tracker', 10); // Dexie version 1.
      request.onupgradeneeded = () => {
        const db = request.result;
        const subjects = db.createObjectStore('subjects', { keyPath: 'id' });
        subjects.createIndex('code', 'code', { unique: true });
        subjects.createIndex('sortOrder', 'sortOrder');
        const exercises = db.createObjectStore('exercises', { keyPath: 'id' });
        exercises.createIndex('subjectId', 'subjectId');
        exercises.createIndex('[subjectId+number]', ['subjectId', 'number'], {
          unique: true,
        });
        const subtopics = db.createObjectStore('subtopics', { keyPath: 'id' });
        subtopics.createIndex('exerciseId', 'exerciseId');
        subtopics.createIndex('[exerciseId+sortOrder]', [
          'exerciseId',
          'sortOrder',
        ]);
        const attempts = db.createObjectStore('attempts', { keyPath: 'id' });
        for (const name of ['exerciseId', 'subtopicId', 'solvedAt'])
          attempts.createIndex(name, name);
        attempts.createIndex('[exerciseId+solvedAt]', [
          'exerciseId',
          'solvedAt',
        ]);
        attempts.createIndex('[subtopicId+solvedAt]', [
          'subtopicId',
          'solvedAt',
        ]);
        const attachments = db.createObjectStore('attachments', {
          keyPath: 'id',
        });
        attachments.createIndex('attemptId', 'attemptId', { unique: true });
        for (const value of data.subjects) subjects.add(value);
        for (const value of data.exercises) exercises.add(value);
        for (const value of data.attempts) attempts.add(value);
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
    });
  }, old);
  await page.goto('/#/subjects/math');
  await expect(page.locator('.exercise-link')).toHaveCount(2);
  const first = page
    .locator('.exercise-link')
    .filter({ hasText: 'Планиметрия.' });
  await expect(first).toHaveAttribute(
    'href',
    `#/subjects/math/exercises/${old.exercises[0]!.id}`,
  );
  await expect(
    page.locator('.exercise-link').filter({ hasText: 'Свойства чисел.' }),
  ).toHaveCount(1);
  await first.click();
  await expect(page.locator('.attempt-row')).toHaveCount(3);
  await page.goto('/#/subjects/russian');
  await expect(page.locator('.exercise-link')).toContainText('Ударения');
  await page.goto('/#/subjects/informatics');
  await expect(page.locator('.exercise-link')).toContainText(
    'Поиск информации в связанных таблицах.',
  );
  await page.goto('/#/settings');
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Экспортировать JSON' }).click();
  const file = await event;
  const backup = JSON.parse(
    await readFile((await file.path())!, 'utf8'),
  ) as BackupFile;
  expect(backup.schemaVersion).toBe(1);
  expect(backup.attempts).toEqual(expect.arrayContaining(old.attempts));
  expect(backup.attempts).toHaveLength(5);
  expect(
    backup.exercises.find((item) => item.id === old.exercises[1]!.id),
  ).toEqual(old.exercises[1]);
  expect(backup.exercises).toHaveLength(4);
});

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import type { BackupFile } from '../../src/domain/backup';

const png =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
function fixture(): BackupFile {
  const now = new Date().toISOString();
  const ago = (days: number) =>
    new Date(Date.now() - days * 86400000).toISOString();
  const subjects = [
    {
      id: crypto.randomUUID(),
      code: 'math' as const,
      title: 'Математика',
      sortOrder: 0,
    },
    {
      id: crypto.randomUUID(),
      code: 'russian' as const,
      title: 'Русский язык',
      sortOrder: 1,
    },
    {
      id: crypto.randomUUID(),
      code: 'informatics' as const,
      title: 'Информатика',
      sortOrder: 2,
    },
  ];
  const exercises = [
    {
      id: crypto.randomUUID(),
      subjectId: subjects[0]!.id,
      number: 1,
      title: 'Задание №1',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      subjectId: subjects[0]!.id,
      number: 2,
      title: 'Движение',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      subjectId: subjects[1]!.id,
      number: 1,
      title: 'Задание №1',
      createdAt: now,
      updatedAt: now,
    },
  ];
  const subtopics = [
    {
      id: crypto.randomUUID(),
      exerciseId: exercises[0]!.id,
      title: 'Старая слабая подтема',
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      exerciseId: exercises[0]!.id,
      title: 'Свежая практика',
      sortOrder: 1,
      createdAt: now,
      updatedAt: now,
    },
  ];
  const attempts = Array.from({ length: 21 }, (_, index) => ({
    id: crypto.randomUUID(),
    exerciseId: index === 20 ? exercises[2]!.id : exercises[0]!.id,
    subtopicId:
      index === 20 ? null : index < 15 ? subtopics[1]!.id : subtopics[0]!.id,
    isCorrect: index < 15,
    solvedAt: index === 20 ? ago(1) : index < 15 ? now : ago(90),
    description: index === 0 ? 'Условие из резервной копии' : null,
    myAnswer: index === 0 ? '001' : null,
    correctAnswer: index === 0 ? '1' : null,
    comment: index === 0 ? 'Комментарий из копии' : null,
    createdAt: now,
    updatedAt: now,
  }));
  return {
    schemaVersion: 1,
    exportedAt: now,
    subjects,
    exercises,
    subtopics,
    attempts,
    attachments: [
      {
        id: crypto.randomUUID(),
        attemptId: attempts[0]!.id,
        filename: 'задача.png',
        mimeType: 'image/png',
        size: Buffer.from(png, 'base64').length,
        base64: png,
        createdAt: now,
      },
    ],
  };
}

async function importBackup(page: Page, backup: BackupFile) {
  await page.goto('/#/settings');
  await page
    .getByLabel('Импортировать резервную копию', { exact: true })
    .setInputFiles({
      name: 'backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(backup)),
    });
  await expect(
    page.getByText('Копия проверена', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Продолжить импорт' }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Заменить данные' })
    .click();
  await expect(
    page.getByText('Резервная копия восстановлена целиком.'),
  ).toBeVisible();
}

async function downloadBackup(page: Page) {
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Экспортировать JSON' }).click();
  const download = await event;
  const path = await download.path();
  expect(path).toBeTruthy();
  return JSON.parse(await readFile(path!, 'utf8')) as BackupFile;
}

test('освоение и повторение, поиск, фильтры и сводка используют реальные данные', async ({
  page,
}) => {
  const data = fixture();
  await importBackup(page, data);
  await page.goto('/#/subjects/math');
  await expect(page.locator('.exercise-link')).toHaveCount(2);
  await expect(
    page.locator('.exercise-link').filter({ hasText: 'Задание №1' }),
  ).toContainText('Отлично');
  await expect(
    page.locator('.exercise-link').filter({ hasText: 'Задание №1' }),
  ).toContainText('Пора повторить подтему');
  await page.getByLabel('Поиск по номеру или названию').fill('ДВИЖ');
  await expect(page.locator('.exercise-link')).toHaveCount(1);
  await expect(page.locator('.exercise-link')).toContainText('Движение');
  await page.getByLabel('Поиск по номеру или названию').fill('');
  await page.getByLabel('Фильтр номеров').selectOption('unseen');
  await expect(page.locator('.exercise-link')).toHaveCount(1);
  await expect(page.locator('.exercise-link')).toContainText('Не изучено');
  await page.getByLabel('Фильтр номеров').selectOption('practice');
  await expect(
    page.getByText('Ничего не найдено', { exact: true }),
  ).toBeVisible();
  await page.getByLabel('Фильтр номеров').selectOption('due');
  await page.getByLabel('Сортировка').selectOption('priority');
  await expect(page.locator('.exercise-link')).toHaveCount(1);
  await page.locator('.exercise-link').click();
  await expect(page.locator('.practice-metrics').first()).toContainText(
    'Отлично',
  );
  await expect(page.locator('.practice-metrics').first()).toContainText(
    '96 / 100',
  );
  await expect(page.locator('.practice-metrics').first()).not.toContainText(
    'Пора повторить',
  );
  await page.goto('/#/review');
  await expect(page.locator('.review-item')).toHaveCount(2);
  const first = page.locator('.review-item').first();
  await expect(first).toContainText('Математика');
  await first.getByText('Рекомендации по подтемам этого номера').click();
  await expect(first).toContainText('Старая слабая подтема');
  await expect(first).toContainText('Низкая точность');
  await expect(first).toContainText('Пора повторить');
  await page.goto('/');
  await expect(
    page
      .locator('.summary-tile')
      .filter({ hasText: 'Всего решений' })
      .locator('strong'),
  ).toHaveText('21');
  await expect(
    page
      .locator('.summary-tile')
      .filter({ hasText: 'Номеров пора повторить' })
      .locator('strong'),
  ).toHaveText('1');
});

test('статистика фильтрует предмет и период, графики и таблица доступны', async ({
  page,
}, testInfo) => {
  await importBackup(page, fixture());
  await page.goto('/#/statistics');
  await expect(
    page
      .locator('.summary-tile')
      .filter({ hasText: 'Решений за период' })
      .locator('strong'),
  ).toHaveText('16');
  await page.getByLabel('Предмет статистики').selectOption('math');
  await expect(
    page
      .locator('.summary-tile')
      .filter({ hasText: 'Решений за период' })
      .locator('strong'),
  ).toHaveText('15');
  await page.getByLabel('Период статистики').selectOption('365');
  await expect(
    page
      .locator('.summary-tile')
      .filter({ hasText: 'Решений за период' })
      .locator('strong'),
  ).toHaveText('20');
  await page.getByText('Таблица решений по дням', { exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('statistics.png') });
  await page.getByLabel('Предмет статистики').selectOption('informatics');
  await expect(
    page.getByText('За этот период нет решений', { exact: true }),
  ).toBeVisible();
  await page.getByLabel('Период статистики').selectOption('custom');
  await page.getByLabel('Начало периода').fill('2026-10-20');
  await page.getByLabel('Конец периода').fill('2026-10-01');
  await expect(page.getByRole('alert')).toContainText('Начало периода');
});

test('экспорт → сброс → подтверждённый импорт восстанавливает историю и изображение', async ({
  page,
}) => {
  const source = fixture();
  await importBackup(page, source);
  const exported = await downloadBackup(page);
  expect(exported.attempts).toHaveLength(21);
  expect(exported.attachments[0]?.base64).toBe(png);
  await page
    .getByRole('button', { name: 'Сбросить данные', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Отмена' })
    .click();
  await page
    .getByRole('button', { name: 'Сбросить данные', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Да, сбросить всё' })
    .click();
  await expect(
    page.getByText('Данные сброшены. Стартовый каталог восстановлен.'),
  ).toBeVisible();
  const empty = await downloadBackup(page);
  expect(empty.attempts).toHaveLength(0);
  expect(empty.attachments).toHaveLength(0);
  expect(empty.exercises).toHaveLength(74);
  await importBackup(page, exported);
  const again = await downloadBackup(page);
  expect({ ...again, exportedAt: exported.exportedAt }).toEqual(exported);
  await page.goto(`/#/subjects/math/exercises/${source.exercises[0]!.id}`);
  await page
    .locator('.attempt-row')
    .filter({ hasText: 'Условие из резервной копии' })
    .locator('.attempt-summary')
    .click();
  await expect(
    page.getByRole('dialog').getByRole('img', { name: 'Скриншот задания' }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByRole('dialog')
        .getByRole('img')
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBe(1);
});

test('неверная копия и отмена подтверждения сохраняют прежнюю базу', async ({
  page,
}) => {
  const data = fixture();
  await importBackup(page, data);
  const before = await downloadBackup(page);
  await page
    .getByLabel('Импортировать резервную копию', { exact: true })
    .setInputFiles({
      name: 'bad.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ ...data, schemaVersion: 999 })),
    });
  await expect(page.getByRole('alert')).toContainText('не поддерживается');
  const afterBad = await downloadBackup(page);
  expect(afterBad.attempts).toEqual(before.attempts);
  await page
    .getByLabel('Импортировать резервную копию', { exact: true })
    .setInputFiles({
      name: 'valid.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({ ...data, attempts: [], attachments: [] }),
      ),
    });
  await page.getByRole('button', { name: 'Продолжить импорт' }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Отмена' })
    .click();
  const afterCancel = await downloadBackup(page);
  expect(afterCancel.attempts).toHaveLength(21);
});

test('манифест и офлайн-кеш содержат только статические ресурсы', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  const manifest = await (
    await page.request.get('/manifest.webmanifest')
  ).json();
  expect(manifest.display).toBe('standalone');
  expect(
    manifest.icons.some(
      (icon: { sizes: string; purpose: string }) =>
        icon.sizes === '512x512' && icon.purpose === 'maskable',
    ),
  ).toBe(true);
  const urls = await page.evaluate(async () => {
    const names = await caches.keys();
    const cache = await caches.open(
      names.find((name) => name.startsWith('ege-static-'))!,
    );
    return (await cache.keys()).map((request) => new URL(request.url).pathname);
  });
  expect(urls).toContain('/index.html');
  expect(urls).toContain('/manifest.webmanifest');
  expect(
    urls.every(
      (path) =>
        path === '/' ||
        path === '/index.html' ||
        path === '/favicon.svg' ||
        path === '/manifest.webmanifest' ||
        path.startsWith('/assets/') ||
        path.startsWith('/icons/') ||
        path.startsWith('/illustrations/'),
    ),
  ).toBe(true);
  expect(urls.some((path) => path.includes('BackupControls'))).toBe(true);
});

test('без сети после закрытия страницы доступны история, новые записи, статистика и экспорт', async ({
  page,
  context,
}) => {
  const data = fixture();
  await importBackup(page, data);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.close();
  const offline = await context.newPage();
  await offline.goto(
    `http://127.0.0.1:4174/#/subjects/math/exercises/${data.exercises[0]!.id}`,
  );
  await expect(offline.locator('.attempt-row')).toHaveCount(20);
  await expect(offline.getByText('Офлайн.', { exact: false })).toBeVisible();
  await offline
    .getByRole('button', { name: 'Добавить решение', exact: true })
    .first()
    .click();
  const dialog = offline.getByRole('dialog');
  await dialog.getByRole('radio', { name: 'Правильно', exact: true }).check();
  await dialog.getByRole('button', { name: 'Сохранить решение' }).click();
  await expect(dialog).not.toBeVisible();
  await offline.reload();
  await expect(offline.locator('.attempt-row')).toHaveCount(21);
  await offline.goto('http://127.0.0.1:4174/#/statistics');
  await expect(
    offline.getByRole('heading', { level: 1, name: 'Статистика' }),
  ).toBeVisible();
  await offline.goto('http://127.0.0.1:4174/#/settings');
  const backup = await downloadBackup(offline);
  expect(backup.attempts).toHaveLength(22);
  expect(backup.attachments[0]?.base64).toBe(png);
  await offline.close();
});

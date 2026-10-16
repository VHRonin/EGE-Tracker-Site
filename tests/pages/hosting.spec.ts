import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';

const prefix = '/ege-tracker/';
async function openFirst(page: Page) {
  await page.goto(`${prefix}#/subjects/math`);
  await page.locator('.exercise-link').first().click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Планиметрия.' }),
  ).toBeVisible();
}
async function add(page: Page, result: string) {
  await page
    .getByRole('button', { name: 'Добавить решение', exact: true })
    .first()
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('radio', { name: result, exact: true }).check();
  await dialog
    .getByRole('button', { name: 'Сохранить решение', exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
}

test('project Pages: локальные ресурсы, шрифты, маршруты и манифест используют подпапку', async ({
  page,
  baseURL,
}) => {
  const failures: string[] = [];
  const outside: string[] = [];
  page.on('response', (response) => {
    if (response.status() >= 400) failures.push(response.url());
  });
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (
      /^https?:/.test(url.protocol) &&
      (url.origin !== baseURL || !url.pathname.startsWith(prefix))
    )
      outside.push(url.href);
  });
  await page.goto(prefix);
  await expect(page.locator('.poster-subject')).toHaveCount(3);
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() => document.fonts.check('700 24px Oswald')),
  ).toBe(true);
  await page.locator('.poster-motivation').scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page
        .locator('main img')
        .evaluateAll((images) =>
          images.every(
            (image) =>
              image instanceof HTMLImageElement &&
              image.complete &&
              image.naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  expect(
    await page
      .locator('.poster-app')
      .evaluate((element) => getComputedStyle(element).backgroundImage),
  ).toContain(`${prefix}illustrations/paper-grain.svg`);
  const manifestURL = await page
    .locator('link[rel="manifest"]')
    .getAttribute('href');
  expect(manifestURL).toBe(`${prefix}manifest.webmanifest`);
  const manifest = await (await page.request.get(manifestURL!)).json();
  expect([manifest.id, manifest.scope, manifest.start_url]).toEqual([
    prefix,
    prefix,
    prefix,
  ]);
  for (const icon of manifest.icons) {
    const url = new URL(icon.src, `${baseURL}${manifestURL}`);
    expect(url.pathname.startsWith(`${prefix}icons/`)).toBe(true);
    expect((await page.request.get(url.href)).ok()).toBe(true);
  }
  await openFirst(page);
  await add(page, 'Правильно');
  await page.reload();
  await expect(page.locator('.attempt-row')).toHaveCount(1);
  for (const route of ['subjects', 'review', 'statistics', 'settings']) {
    await page.goto(`${prefix}#/${route}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
  await expect(
    page.getByLabel('Импортировать резервную копию', { exact: true }),
  ).toBeVisible();
  expect(failures).toEqual([]);
  expect(outside).toEqual([]);
});

test('project Pages: свой scope, изоляция кэшей и работа с историей и экспортом без сети', async ({
  page,
  context,
  baseURL,
}) => {
  await page.goto(`${prefix}favicon.svg`);
  await page.evaluate(async () => {
    await caches.open('ege-static-%2Fege-tracker%2F-stale');
    await caches.open('ege-static-%2Fanother-project%2F-keep');
  });
  await page.goto(prefix);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  const state = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    const names = await caches.keys();
    const current = names.find((name) =>
      name.startsWith('ege-static-%2Fege-tracker%2F-'),
    )!;
    const cache = await caches.open(current);
    return {
      scope: registration.scope,
      script: registration.active?.scriptURL,
      names,
      paths: (await cache.keys()).map(
        (request) => new URL(request.url).pathname,
      ),
    };
  });
  expect(state.scope).toBe(`${baseURL}${prefix}`);
  expect(state.script).toBe(`${baseURL}${prefix}sw.js`);
  expect(state.names).not.toContain('ege-static-%2Fege-tracker%2F-stale');
  expect(state.names).toContain('ege-static-%2Fanother-project%2F-keep');
  expect(state.paths.length).toBeGreaterThan(10);
  expect(state.paths.every((path) => path.startsWith(prefix))).toBe(true);
  await openFirst(page);
  await add(page, 'Правильно');
  await context.setOffline(true);
  await page.close();
  const offline = await context.newPage();
  await openFirst(offline);
  await expect(offline.locator('.attempt-row')).toHaveCount(1);
  await add(offline, 'Неправильно');
  await expect(offline.locator('.attempt-row')).toHaveCount(2);
  await offline.goto(`${prefix}#/settings`);
  const event = offline.waitForEvent('download');
  await offline.getByRole('button', { name: 'Экспортировать JSON' }).click();
  const download = await event;
  const backup = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(backup.schemaVersion).toBe(1);
  expect(backup.attempts).toHaveLength(2);
  await context.setOffline(false);
});

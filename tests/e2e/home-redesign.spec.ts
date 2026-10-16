import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { homeBackup, homeNow } from '../fixtures/homeBackup';

test.use({ timezoneId: 'Europe/Moscow' });

async function populatedHome(page: Page) {
  await page.clock.setFixedTime(new Date(homeNow));
  await page.goto('/#/settings');
  await page
    .getByLabel('Импортировать резервную копию', { exact: true })
    .setInputFiles({
      name: 'home.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(homeBackup())),
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
  await page.goto('/');
  await expect(page.locator('.poster-subject')).toHaveCount(3);
  await page.evaluate(() => document.fonts.ready);
}

test('пустая главная: честная дата, точность и нулевые дни, локальные иллюстрации', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByText('Ты ещё не добавил ни одного решения'),
  ).toBeVisible();
  await expect(page.locator('.last-practice-note time')).toHaveCount(0);
  await expect(page.locator('.poster-accuracy strong')).toHaveText('—');
  await expect(page.locator('.poster-bars__day')).toHaveCount(7);
  const heights = await page
    .locator('.poster-bars__track > div')
    .evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().height),
    );
  expect(heights).toEqual(Array(14).fill(0));
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
  await page.getByRole('link', { name: 'К предметам', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Твои предметы', level: 1 }),
  ).toBeVisible();
  await expect(page.locator('.poster-home')).toHaveCount(0);
});

test('главная использует реальную историю, локальные дни и существующие переходы', async ({
  page,
}) => {
  await populatedHome(page);
  await expect(page.locator('.last-practice-note time')).toHaveText(
    '16 октября 2026 г.',
  );
  await expect(page.locator('.poster-accuracy strong')).toHaveText('60 %');
  await expect(page.locator('.poster-totals__numbers dd')).toHaveText([
    '5',
    '3',
    '2',
  ]);
  await expect(page.locator('.poster-weekly__total')).toHaveText(
    'Решений за 7 дней: 4',
  );
  await expect(page.locator('.poster-subject--math')).toContainText(
    'Решений: 3',
  );
  await expect(page.locator('.poster-subject--math')).toContainText('33 %');
  await expect(page.locator('.poster-recent__list li')).toHaveCount(5);
  await page.getByText('Данные по дням', { exact: true }).click();
  const days = page.locator('.poster-weekly__details li');
  await expect(days).toHaveCount(7);
  await expect(days.nth(0)).toContainText('1 правильно / 0 неправильно');
  await expect(days.nth(5)).toContainText('1 правильно / 1 неправильно');
  await expect(days.nth(6)).toContainText('1 правильно / 0 неправильно');
  const axe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(axe.violations).toEqual([]);
  const recent = page.locator('.poster-recent__list a').first();
  const route = await recent.getAttribute('href');
  await recent.focus();
  await page.keyboard.press('Enter');
  expect(new URL(page.url()).hash).toBe(route);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Планиметрия',
  );
  await expect(page.locator('.poster-home')).toHaveCount(0);
});

test('адаптация главной на 320–1440 px и текст 200%', async ({ page }) => {
  await populatedHome(page);
  for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const fontSize of ['100%', '200%']) {
      await page.evaluate((size) => {
        document.documentElement.style.fontSize = size;
      }, fontSize);
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${width}px / ${fontSize}`,
      ).toBe(true);
      const clipped = await page
        .locator('.poster-hero__copy h1, .poster-subject__body, .poster-panel')
        .evaluateAll((elements) =>
          elements
            .filter((element) => element.scrollWidth > element.clientWidth + 1)
            .map((element) => element.className),
        );
      expect(clipped, `${width}px / ${fontSize}`).toEqual([]);
    }
  }
});

test('новые иллюстрации и главная доступны без сети', async ({
  page,
  context,
}) => {
  await populatedHome(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.poster-accuracy strong')).toHaveText('60 %');
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
  await context.setOffline(false);
});

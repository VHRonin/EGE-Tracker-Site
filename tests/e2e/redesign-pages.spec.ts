import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { homeBackup, homeNow } from '../fixtures/homeBackup';

async function importPractice(page: Page) {
  const data = homeBackup();
  data.exercises[0]!.title =
    'Геометрия: углы, расстояния и ОченьДлинноеНазваниеБезПробелов'
      .repeat(2)
      .slice(0, 120);
  data.attempts[0]!.comment = 'Подробный разбор решения '.repeat(20);
  data.subtopics.push({
    id: crypto.randomUUID(),
    exerciseId: data.exercises[0]!.id,
    title: 'ОченьДлинноеНазваниеНеобязательнойПодтемы'.repeat(3).slice(0, 120),
    sortOrder: 0,
    createdAt: homeNow,
    updatedAt: homeNow,
  });
  data.attempts[0]!.subtopicId = data.subtopics[0]!.id;
  await page.clock.setFixedTime(new Date(homeNow));
  await page.goto('/#/settings');
  await page
    .getByLabel('Импортировать резервную копию', { exact: true })
    .setInputFiles({
      name: 'practice.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(data)),
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
  return `/subjects/math/exercises/${data.exercises[0]!.id}`;
}

test('все экраны: длинные названия, узкие размеры и текст 200%', async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const exercise = await importPractice(page);
  const widths =
    testInfo.project.name === 'mobile'
      ? [320, 360, 390, 430]
      : [768, 1024, 1440];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    for (const fontSize of ['100%', '200%']) {
      for (const route of [
        '/subjects',
        '/subjects/math',
        '/subjects/russian',
        exercise,
        '/review',
        '/statistics',
        '/settings',
      ]) {
        await page.goto(`/#${route}`);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await page.evaluate((size) => {
          document.documentElement.style.fontSize = size;
        }, fontSize);
        await page.evaluate(() => document.fonts.ready);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${route} / ${width} / ${fontSize}`,
        ).toBe(true);
        const clipped = await page
          .locator(
            '.page-heading, .card, .exercise-link, .subject-card, .review-overview',
          )
          .evaluateAll((elements) =>
            elements
              .filter(
                (element) => element.scrollWidth > element.clientWidth + 2,
              )
              .map((element) => element.className),
          );
        expect(clipped, `${route} / ${width} / ${fontSize}`).toEqual([]);
      }
    }
  }
});

test('формы и опасные действия: доступность и переносы при тексте 200%', async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const exercise = await importPractice(page);
  await page.goto(`/#${exercise}`);
  await page
    .getByRole('button', { name: 'Добавить решение', exact: true })
    .first()
    .click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('radio', { checked: true })).toHaveCount(0);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await dialog.getByRole('radio', { name: 'Правильно', exact: true }).check();
  await dialog.getByRole('button', { name: 'Добавить подробности' }).click();
  await expect(dialog.getByLabel('Условие или описание')).toBeVisible();
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth + 1,
    ),
  ).toBe(true);
  const axe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(axe.violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('form-text-200.png') });
  await dialog.getByRole('button', { name: 'Отмена', exact: true }).click();
  await page.goto('/#/settings');
  await page
    .getByRole('button', { name: 'Сбросить данные', exact: true })
    .click();
  await expect(dialog).toHaveClass(/dialog--danger/);
  await expect(
    dialog.getByRole('button', { name: 'Да, сбросить всё' }),
  ).toBeVisible();
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth + 1,
    ),
  ).toBe(true);
  const dangerAxe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(dangerAxe.violations).toEqual([]);
  await dialog.getByRole('button', { name: 'Отмена', exact: true }).click();
  await page.goto(`/#${exercise}`);
  await expect(page.locator('.attempt-row')).toHaveCount(3);
});

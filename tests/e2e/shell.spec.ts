import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('пять разделов, возврат назад и перезагрузка прямого адреса', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const navigation = page.getByRole('navigation', {
    name: 'Основная навигация',
  });
  for (const [label, heading] of [
    ['Предметы', 'Твои предметы'],
    ['Повторить', 'Повторить'],
    ['Статистика', 'Статистика'],
    ['Настройки', 'Настройки и данные'],
    ['Главная', 'Твоя подготовка. Твои правила.'],
  ] as const) {
    await navigation.getByRole('link', { name: label }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: heading }),
    ).toBeVisible();
    await expect(navigation.getByRole('link', { name: label })).toHaveAttribute(
      'aria-current',
      'page',
    );
  }
  await page.goBack();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Настройки и данные' }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Настройки и данные' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('карточки всех трёх предметов и неизвестная страница', async ({
  page,
}) => {
  for (const subject of ['Математика', 'Русский язык', 'Информатика']) {
    await page.goto('/#/subjects');
    await page.locator('.subject-card').filter({ hasText: subject }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: subject, exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole('heading', { level: 1, name: subject, exact: true }),
    ).toBeVisible();
  }
  await page.goto('/#/unknown');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Страница не найдена' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'На главную', exact: true }).click();
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Твоя подготовка. Твои правила.',
    }),
  ).toBeVisible();
});

test('диалог: клавиатура, замкнутый фокус, Escape и возврат к кнопке', async ({
  page,
}) => {
  await page.goto('/#/settings');
  const trigger = page.getByRole('button', { name: 'О приложении' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'О ЕГЭ Трекере' });
  const close = dialog.getByRole('button', { name: 'Закрыть диалог' });
  const confirm = dialog.getByRole('button', { name: 'Понятно' });
  await expect(dialog).toBeVisible();
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(confirm).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await page.keyboard.press('Enter');
  await confirm.click();
  await expect(trigger).toBeFocused();
});

test('переход к содержимому с клавиатуры', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Перейти к содержимому' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  await expect(page).not.toHaveURL(/#main-content/);
});

test('основные экраны без нарушений axe и горизонтальной прокрутки', async ({
  page,
}) => {
  // Measure settled states: route changes animate navigation colors.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of [
    '/',
    '/subjects',
    '/review',
    '/statistics',
    '/settings',
  ]) {
    await page.goto(`/#${route}`);
    await page.evaluate(() => document.fonts.ready);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(result.violations, route).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      route,
    ).toBe(true);
    const links = page.getByRole('navigation').getByRole('link');
    for (const link of await links.all()) await expect(link).toBeInViewport();
  }
});

test('промежуточные ширины и режим уменьшения движения', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      String(width),
    ).toBe(true);
    await expect(page.getByRole('navigation')).toBeVisible();
  }
  expect(
    await page
      .locator('.subject-card')
      .first()
      .evaluate((element) => getComputedStyle(element).transitionDuration),
  ).toBe('0s');
});

test('приложение получает ресурсы только со своего адреса', async ({
  page,
  baseURL,
}) => {
  const external: string[] = [];
  page.on('request', (request) => {
    if (
      !request.url().startsWith(baseURL ?? '') &&
      /^https?:/.test(request.url())
    )
      external.push(request.url());
  });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  expect(external).toEqual([]);
});

test('скриншот главной страницы', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: testInfo.outputPath('home.png'),
    fullPage: true,
  });
});

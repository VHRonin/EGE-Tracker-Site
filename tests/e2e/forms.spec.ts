import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('базовая форма работает целиком с клавиатуры', async ({ page }) => {
  // Dev-only fixture; it is not part of the production entry point or product routes.
  await page.goto('http://127.0.0.1:4173/tests/fixtures/ui.html');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Название', { exact: true })).toBeFocused();
  await page.keyboard.type('Название');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Предмет')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Комментарий')).toBeFocused();
  await page.keyboard.type('Заметка');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('radio', { name: 'Правильно', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(
    page.getByRole('radio', { name: 'Неправильно', exact: true }),
  ).toBeChecked();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText(
    'Форма отправлена: неправильно',
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

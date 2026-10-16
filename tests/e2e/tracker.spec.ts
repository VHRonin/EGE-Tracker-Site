import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);
async function openExercise(page: Page) {
  await page.goto('/#/subjects/math');
  await page
    .locator('.exercise-link')
    .filter({ has: page.getByText('Планиметрия.', { exact: true }) })
    .first()
    .click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Планиметрия.', exact: true }),
  ).toBeVisible();
}
async function addQuick(page: Page, correct = true) {
  await page
    .getByRole('button', { name: 'Добавить решение', exact: true })
    .first()
    .click();
  const dialog = page.getByRole('dialog', {
    name: 'Добавить решение',
    exact: true,
  });
  await expect(
    dialog.getByRole('button', { name: 'Сохранить решение' }),
  ).toBeDisabled();
  await dialog
    .getByRole('radio', {
      name: correct ? 'Правильно' : 'Неправильно',
      exact: true,
    })
    .check();
  await dialog.getByRole('button', { name: 'Сохранить решение' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(dialog).not.toBeVisible();
}

test('быстрый ввод только с результатом и история после перезагрузки', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openExercise(page);
  await addQuick(page);
  await addQuick(page, false);
  await expect(page.locator('.attempt-row')).toHaveCount(2);
  await page.reload();
  await expect(page.locator('.attempt-row')).toHaveCount(2);
  await expect(
    page.locator('.attempt-row .badge').filter({ hasText: /^Правильно$/ }),
  ).toHaveCount(1);
  await expect(
    page.locator('.attempt-row .badge').filter({ hasText: /^Неправильно$/ }),
  ).toHaveCount(1);
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Главная' })
    .click();
  await expect(page.locator('.recent-list li')).toHaveCount(2);
  await expect(
    page.locator('.subject-card').filter({ hasText: 'Математика' }),
  ).toContainText('Решений: 2');
  expect(errors).toEqual([]);
});

test('подтемы: создание, переименование, фильтр и удаление без потери решений', async ({
  page,
}) => {
  await openExercise(page);
  await page.getByRole('button', { name: 'Добавить подтему' }).click();
  await page.getByLabel('Название подтемы').fill('Текстовые задачи');
  await page.getByRole('button', { name: 'Сохранить подтему' }).click();
  await addQuick(page);
  await page
    .getByRole('button', { name: 'Добавить решение', exact: true })
    .first()
    .click();
  let dialog = page.getByRole('dialog');
  await dialog.getByRole('radio', { name: 'Неправильно', exact: true }).check();
  await dialog.getByRole('button', { name: 'Добавить подробности' }).click();
  await dialog
    .getByLabel('Подтема', { exact: true })
    .selectOption({ label: 'Текстовые задачи' });
  await dialog.getByRole('button', { name: 'Сохранить решение' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.attempt-row')).toHaveCount(2);
  await page
    .getByRole('button', { name: 'Переименовать подтему «Текстовые задачи»' })
    .click();
  await page.getByLabel('Название подтемы').fill('Задачи на движение');
  await page.getByRole('button', { name: 'Сохранить подтему' }).click();
  await page
    .getByLabel('Показать решения')
    .selectOption({ label: 'Без подтемы' });
  await expect(page.locator('.attempt-row')).toHaveCount(1);
  await page
    .getByLabel('Показать решения')
    .selectOption({ label: 'Задачи на движение' });
  await expect(page.locator('.attempt-row')).toHaveCount(1);
  await page
    .getByRole('button', { name: 'Удалить подтему «Задачи на движение»' })
    .click();
  dialog = page.getByRole('dialog', { name: 'Удалить подтему?' });
  await dialog.getByRole('button', { name: 'Отмена' }).click();
  await expect(page.locator('.topic-list li')).toHaveCount(1);
  await page
    .getByRole('button', { name: 'Удалить подтему «Задачи на движение»' })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Удалить подтему', exact: true })
    .click();
  await page
    .getByLabel('Показать решения')
    .selectOption({ label: 'Без подтемы' });
  await expect(page.locator('.attempt-row')).toHaveCount(2);
  await page.reload();
  await expect(page.locator('.attempt-row')).toHaveCount(2);
  await expect(
    page.locator('.attempt-topic').filter({ hasText: 'Без подтемы' }),
  ).toHaveCount(2);
});

test('подробное решение, безопасные ответы, скриншот, редактирование и удаление', async ({
  page,
}) => {
  await openExercise(page);
  await page
    .getByRole('button', { name: 'Добавить решение', exact: true })
    .first()
    .click();
  let dialog = page.getByRole('dialog', {
    name: 'Добавить решение',
    exact: true,
  });
  await dialog.getByRole('button', { name: 'Добавить подробности' }).click();
  await dialog
    .getByLabel('Дата и время решения', { exact: true })
    .fill('2025-01-02T10:30');
  await dialog
    .getByLabel('Условие или описание')
    .fill('<script>window.hacked=true</script> Решить задачу');
  await dialog.getByLabel('Мой ответ', { exact: true }).fill('001');
  await dialog.getByLabel('Правильный ответ', { exact: true }).fill('1');
  await expect(
    dialog.getByRole('button', { name: 'Сохранить решение' }),
  ).toBeDisabled();
  await dialog
    .getByRole('button', { name: 'Использовать: неправильно', exact: true })
    .click();
  await dialog.getByRole('radio', { name: 'Правильно', exact: true }).check();
  await dialog.getByLabel('Комментарий').fill('Результат проверен вручную');
  await dialog
    .getByLabel('Скриншот задания')
    .setInputFiles({ name: 'задача.png', mimeType: 'image/png', buffer: png });
  await expect(
    dialog.getByRole('img', { name: 'Предпросмотр скриншота задания' }),
  ).toBeVisible();
  await expect
    .poll(() =>
      dialog
        .getByRole('img')
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBe(1);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await dialog.getByRole('button', { name: 'Сохранить решение' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.attempt-row')).toHaveCount(1);
  await page.reload();
  await page.locator('.attempt-summary').click();
  dialog = page.getByRole('dialog', { name: 'Решение', exact: true });
  await expect(dialog).toContainText('Результат проверен вручную');
  await expect(dialog).toContainText('001');
  await expect(dialog).toContainText('2025');
  await expect(
    dialog.getByRole('img', { name: 'Скриншот задания' }),
  ).toBeVisible();
  await expect
    .poll(() =>
      dialog
        .getByRole('img')
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBe(1);
  expect(
    await page.evaluate(() => Reflect.get(window, 'hacked')),
  ).toBeUndefined();
  await dialog.getByRole('button', { name: 'Изменить решение' }).click();
  dialog = page.getByRole('dialog', { name: 'Изменить решение', exact: true });
  await dialog.getByLabel('Мой ответ', { exact: true }).fill('2');
  await expect(
    dialog.getByRole('radio', { name: 'Правильно', exact: true }),
  ).toBeChecked();
  await dialog.getByLabel('Комментарий').fill('Исправленный комментарий');
  await dialog.getByRole('button', { name: 'Сохранить решение' }).click();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await page.locator('.attempt-summary').click();
  dialog = page.getByRole('dialog', { name: 'Решение', exact: true });
  await expect(dialog).toContainText('Исправленный комментарий');
  await expect(dialog.getByRole('img')).toBeVisible();
  await dialog.getByRole('button', { name: 'Закрыть', exact: true }).click();
  await page.getByRole('button', { name: /^Удалить решение от/ }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Отмена' })
    .click();
  await expect(page.locator('.attempt-row')).toHaveCount(1);
  await page.getByRole('button', { name: /^Удалить решение от/ }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Удалить решение', exact: true })
    .click();
  await expect(page.locator('.attempt-row')).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('Запиши первое решение')).toBeVisible();
});

test('пакетный ввод проверяет лимит и создаёт редактируемые отдельные записи', async ({
  page,
}) => {
  await openExercise(page);
  await page
    .getByRole('button', { name: 'Добавить пачку', exact: true })
    .click();
  let dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Сохранить пачку' }).click();
  await expect(dialog.getByRole('alert')).toContainText('от 1 до 100');
  await dialog.getByLabel('Правильных', { exact: true }).fill('60');
  await dialog.getByLabel('Неправильных', { exact: true }).fill('60');
  await dialog.getByRole('button', { name: 'Сохранить пачку' }).click();
  await expect(dialog.getByRole('alert')).toContainText('от 1 до 100');
  await dialog.getByLabel('Правильных', { exact: true }).fill('2');
  await dialog.getByLabel('Неправильных', { exact: true }).fill('1');
  await dialog.getByRole('button', { name: 'Сохранить пачку' }).click();
  await expect(page.locator('.attempt-row')).toHaveCount(3);
  await page
    .getByRole('button', { name: /^Изменить решение от/ })
    .first()
    .click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Комментарий').fill('Только одна запись');
  await dialog.getByRole('button', { name: 'Сохранить решение' }).click();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await expect(page.locator('.attempt-row')).toHaveCount(3);
  await expect(
    page.locator('.attempt-snippet').filter({ hasText: 'Только одна запись' }),
  ).toHaveCount(1);
});

test('изменение каталога, защита от дубликата и каскадное удаление', async ({
  page,
}) => {
  await page.goto('/#/subjects/math');
  await page
    .getByRole('button', { name: 'Добавить номер', exact: true })
    .click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Номер задания').fill('1');
  await dialog.getByRole('button', { name: 'Сохранить номер' }).click();
  await expect(dialog.getByRole('alert')).toContainText('уже есть');
  await dialog.getByLabel('Номер задания').fill('99');
  await dialog.getByLabel('Название', { exact: true }).fill('Мой номер');
  await dialog.getByRole('button', { name: 'Сохранить номер' }).click();
  await page
    .getByRole('link')
    .filter({ has: page.getByText('Мой номер', { exact: true }) })
    .click();
  await addQuick(page);
  await page
    .getByRole('button', { name: 'Изменить номер', exact: true })
    .click();
  dialog = page.getByRole('dialog');
  await dialog
    .getByLabel('Название', { exact: true })
    .fill('Переименованный номер');
  await dialog.getByRole('button', { name: 'Сохранить номер' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Переименованный номер' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Удалить номер', exact: true })
    .click();
  dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('решения (1)');
  await dialog.getByRole('button', { name: 'Отмена' }).click();
  await expect(page.locator('.attempt-row')).toHaveCount(1);
  await page
    .getByRole('button', { name: 'Удалить номер', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Удалить номер и историю' })
    .click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Математика' }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator('.exercise-link')).toHaveCount(20);
});

test('невалидные изображения не сохраняются, отказ от файла позволяет быстрый ввод', async ({
  page,
}) => {
  await openExercise(page);
  await page
    .getByRole('button', { name: 'Добавить решение', exact: true })
    .first()
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('radio', { name: 'Правильно', exact: true }).check();
  await dialog.getByRole('button', { name: 'Добавить подробности' }).click();
  await dialog.getByLabel('Скриншот задания').setInputFiles({
    name: 'fake.png',
    mimeType: 'image/png',
    buffer: Buffer.from('not an image'),
  });
  await expect(dialog.getByRole('alert')).toContainText('Содержимое файла');
  await expect(
    dialog.getByRole('button', { name: 'Сохранить решение' }),
  ).toBeDisabled();
  await dialog.getByLabel('Скриншот задания').setInputFiles({
    name: 'large.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
  });
  await expect(dialog.getByRole('alert')).toContainText('10 МБ');
  await dialog.getByRole('button', { name: 'Отменить выбор файла' }).click();
  await dialog.getByRole('button', { name: 'Сохранить решение' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.attempt-row')).toHaveCount(1);
});

test('номер и формы доступны с клавиатуры и на узком экране', async ({
  page,
}, testInfo) => {
  await openExercise(page);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole('button', { name: 'Добавить решение', exact: true })
    .first()
    .focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(
    dialog.getByRole('button', { name: 'Закрыть диалог' }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space');
  await expect(
    dialog.getByRole('radio', { name: 'Правильно', exact: true }),
  ).toBeChecked();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(dialog.getByLabel('Условие или описание')).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('attempt-form.png') });
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('exercise.png'),
    fullPage: true,
  });
});

test('изменения из другой вкладки появляются без перезагрузки', async ({
  page,
  context,
}) => {
  await openExercise(page);
  const second = await context.newPage();
  await second.goto(page.url());
  await expect(second.getByText('Запиши первое решение')).toBeVisible();
  await addQuick(page);
  await expect(second.locator('.attempt-row')).toHaveCount(1);
  await second.close();
});

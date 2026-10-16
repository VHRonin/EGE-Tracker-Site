import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('Навигация каркаса', () => {
  it('открывает все основные разделы и обозначает текущий', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    const navigation = within(
      screen.getByRole('navigation', { name: 'Основная навигация' }),
    );
    for (const [label, heading] of [
      ['Предметы', 'Твои предметы'],
      ['Повторить', 'Повторить'],
      ['Статистика', 'Статистика'],
      ['Настройки', 'Настройки и данные'],
      ['Главная', 'Твоя подготовка. Твои правила.'],
    ]) {
      const link = navigation.getByRole('link', { name: label });
      await user.click(link);
      expect(link).toHaveAttribute('aria-current', 'page');
      expect(
        screen.getByRole('heading', { level: 1, name: heading }),
      ).toBeVisible();
      expect(screen.getByRole('main')).toHaveFocus();
    }
  });

  it('ведёт из карточки предмета на его страницу', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    await user.click(
      await screen.findByRole('link', {
        name: /Математика Профильный уровень/,
      }),
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Математика' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Предметы' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      screen.getAllByText('Планиметрия.', { exact: true })[0],
    ).toBeVisible();
  });

  it.each(['/missing', '/subjects/unknown'])(
    'обрабатывает неизвестный адрес %s',
    async (path) => {
      render(
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>,
      );
      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: 'Страница не найдена',
        }),
      ).toBeVisible();
      expect(screen.getByRole('link', { name: 'На главную' })).toHaveAttribute(
        'href',
        '/',
      );
    },
  );
});

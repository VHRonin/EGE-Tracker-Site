import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import {
  RadioGroup,
  SelectField,
  TextAreaField,
  TextField,
} from './FormControls';

describe('Доступные элементы формы', () => {
  it('связывает подпись, подсказку и ошибку с полем', () => {
    render(
      <TextField
        label="Название"
        hint="Краткое название"
        error="Заполните название"
        required
      />,
    );
    const input = screen.getByRole('textbox', { name: 'Название' });
    expect(input).toBeRequired();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(
      'Краткое название Заполните название',
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Заполните название');
  });

  it('принимает текст с клавиатуры и связывает подписи с select и textarea', async () => {
    const user = userEvent.setup();
    render(
      <>
        <TextAreaField label="Комментарий" />
        <SelectField label="Предмет">
          <option>Математика</option>
          <option>Русский язык</option>
        </SelectField>
      </>,
    );
    await user.type(screen.getByLabelText('Комментарий'), 'Текст заметки');
    await user.selectOptions(screen.getByLabelText('Предмет'), 'Русский язык');
    expect(screen.getByLabelText('Комментарий')).toHaveValue('Текст заметки');
    expect(screen.getByLabelText('Предмет')).toHaveValue('Русский язык');
  });

  it('сообщает о выборе в подписанной группе результата', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RadioGroup
        legend="Результат"
        name="result"
        value=""
        onChange={onChange}
        options={[
          { value: 'correct', label: 'Правильно' },
          { value: 'incorrect', label: 'Неправильно' },
        ]}
      />,
    );
    expect(screen.getByRole('group', { name: 'Результат' })).toBeVisible();
    await user.click(screen.getByLabelText('Правильно'));
    expect(onChange).toHaveBeenCalledWith('correct');
  });

  it('не отправляет форму обычной кнопкой и не активирует отключённую', async () => {
    const user = userEvent.setup();
    const submit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const click = vi.fn();
    render(
      <form onSubmit={submit}>
        <Button>Подробнее</Button>
        <Button disabled onClick={click}>
          Недоступно
        </Button>
        <Button type="submit">Отправить</Button>
      </form>,
    );
    await user.click(screen.getByRole('button', { name: 'Подробнее' }));
    await user.click(screen.getByRole('button', { name: 'Недоступно' }));
    expect(submit).not.toHaveBeenCalled();
    expect(click).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Отправить' }));
    expect(submit).toHaveBeenCalledTimes(1);
  });
});

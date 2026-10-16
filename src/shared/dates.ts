import { ValidationError } from '../domain/validation';

export function toLocalInput(iso: string) {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function fromLocalInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value))
    throw new ValidationError('Укажите корректные дату и время.');
  const date = new Date(value);
  const expected = value.length === 16 ? `${value}:00` : value;
  if (
    !Number.isFinite(date.getTime()) ||
    toLocalInput(date.toISOString()) !== expected
  )
    throw new ValidationError(
      'Такой даты или времени не существует в вашем часовом поясе.',
    );
  return date.toISOString();
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

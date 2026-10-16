import type { AttemptInput } from './entities';

export class ValidationError extends Error {}
export const limits = {
  title: 120,
  description: 20_000,
  answer: 2_000,
  comment: 10_000,
  batch: 100,
  imageBytes: 10 * 1024 * 1024,
} as const;

export function uuid(value: string): string {
  if (
    typeof value !== 'string' ||
    !/^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(
      value,
    )
  )
    throw new ValidationError('Некорректный идентификатор записи.');
  return value;
}

export function textValue(
  value: string,
  maximum: number,
  label: string,
): string {
  if (
    typeof value !== 'string' ||
    value.length > maximum ||
    Array.from(value).some(
      (character) =>
        character.charCodeAt(0) < 32 && !'\n\r\t'.includes(character),
    )
  )
    throw new ValidationError(
      `${label}: допустимо до ${maximum} символов без управляющих знаков.`,
    );
  return value;
}

export function titleValue(value: string): string {
  const title = textValue(value, limits.title, 'Название').trim();
  if (!title) throw new ValidationError('Введите название.');
  return title;
}

export function positiveInteger(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > 999)
    throw new ValidationError('Номер должен быть целым числом от 1 до 999.');
  return value;
}

export function isoDate(value: string): string {
  const date = new Date(value);
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) ||
    !Number.isFinite(date.getTime())
  )
    throw new ValidationError('Укажите корректные дату и время.');
  // Date.parse silently normalizes e.g. February 30; reject such dates.
  if (date.toISOString().slice(0, 19) !== value.slice(0, 19))
    throw new ValidationError('Такой даты не существует.');
  return date.toISOString();
}

function optionalText(
  value: string | null | undefined,
  maximum: number,
  label: string,
) {
  if (value == null) return null;
  const text = textValue(value, maximum, label);
  return text.trim() ? text : null;
}

export function attemptFields(input: AttemptInput, now: string) {
  if (typeof input.isCorrect !== 'boolean')
    throw new ValidationError('Выберите результат: правильно или неправильно.');
  return {
    exerciseId: uuid(input.exerciseId),
    subtopicId: input.subtopicId == null ? null : uuid(input.subtopicId),
    isCorrect: input.isCorrect,
    solvedAt: isoDate(input.solvedAt ?? now),
    description: optionalText(
      input.description,
      limits.description,
      'Описание',
    ),
    myAnswer: optionalText(input.myAnswer, limits.answer, 'Мой ответ'),
    correctAnswer: optionalText(
      input.correctAnswer,
      limits.answer,
      'Правильный ответ',
    ),
    comment: optionalText(input.comment, limits.comment, 'Комментарий'),
  };
}

export function batchCounts(correct: number, incorrect: number) {
  if (
    ![correct, incorrect].every((n) => Number.isSafeInteger(n) && n >= 0) ||
    correct + incorrect < 1 ||
    correct + incorrect > limits.batch
  )
    throw new ValidationError(
      `Укажите целые неотрицательные количества, всего от 1 до ${limits.batch} решений.`,
    );
}

export function errorMessage(error: unknown): string {
  if (error instanceof ValidationError) return error.message;
  if (error instanceof Error && error.name === 'ConstraintError')
    return 'Такой номер уже есть в этом предмете.';
  if (error instanceof Error && error.name === 'QuotaExceededError')
    return 'Недостаточно места в браузере. Запись не сохранена. Попробуйте скриншот меньшего размера.';
  return 'Не удалось выполнить операцию. Данные не изменены. Попробуйте ещё раз.';
}

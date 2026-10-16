import { describe, expect, it } from 'vitest';
import { suggestAnswer } from './answers';
import { attemptFields, isoDate, titleValue } from './validation';
import { fromLocalInput, toLocalInput } from '../shared/dates';

describe('Осторожное сравнение ответов', () => {
  it('нормализует только NFC и внешние пробелы', () => {
    expect(suggestAnswer(' 42 ', '42')).toBe(true);
    expect(suggestAnswer('е\u0308', 'ё')).toBe(true);
    expect(suggestAnswer('001', '1')).toBe(false);
    expect(suggestAnswer('АБВ', 'абв')).toBe(false);
    expect(suggestAnswer('1,5', '1.5')).toBe(false);
    expect(suggestAnswer('+1', '1')).toBe(false);
  });
  it.each([
    ['', '1'],
    [' ', '1'],
    ['1 2', '12'],
    ['1/2', '0.5'],
    ['x+1', '1+x'],
    ['return 1;', '1'],
    ['1\n2', '12'],
    ['a'.repeat(101), 'a'],
  ])('не предлагает результат для неоднозначного формата %s', (my, correct) => {
    expect(suggestAnswer(my, correct)).toBeNull();
  });
  it('не меняет выбранный пользователем результат при несовпадающих ответах', () => {
    const input = {
      exerciseId: crypto.randomUUID(),
      isCorrect: true,
      myAnswer: '1',
      correctAnswer: '2',
    };
    expect(attemptFields(input, '2026-10-15T12:00:00Z')).toMatchObject(input);
  });
});

describe('Входные данные', () => {
  it('отклоняет отсутствующий результат и слишком длинный текст', () => {
    expect(() =>
      attemptFields(
        {
          exerciseId: crypto.randomUUID(),
          isCorrect: undefined as unknown as boolean,
        },
        '2026-10-15T12:00:00Z',
      ),
    ).toThrow('Выберите результат');
    expect(() => titleValue('x'.repeat(121))).toThrow();
    expect(() => titleValue('a\u0000b')).toThrow();
  });
  it('сохраняет пользовательский текст без HTML-интерпретации и преобразований ответов', () => {
    const result = attemptFields(
      {
        exerciseId: crypto.randomUUID(),
        isCorrect: false,
        comment: '<script>alert(1)</script>',
        myAnswer: ' 001 ',
        correctAnswer: '1 2',
      },
      '2026-10-15T12:00:00Z',
    );
    expect(result.comment).toBe('<script>alert(1)</script>');
    expect(result.myAnswer).toBe(' 001 ');
    expect(result.correctAnswer).toBe('1 2');
  });
  it('проверяет реальность дат и преобразует локальное время в UTC', () => {
    expect(() => isoDate('2026-02-30T10:00:00Z')).toThrow();
    expect(() => fromLocalInput('2026-02-30T10:00')).toThrow();
    expect(() => fromLocalInput('')).toThrow();
    const date = '2026-10-15T12:34:56.000Z';
    expect(fromLocalInput(toLocalInput(date))).toBe(date);
  });
});

import { describe, expect, it } from 'vitest';
import {
  dailyStatistics,
  localDayKey,
  periodRange,
  selectExercises,
} from './statistics';
import { exerciseProgress } from './scoring';
import type { Attempt, Exercise, Subject } from './entities';

const subject: Subject = {
  id: 's',
  code: 'math',
  title: 'Математика',
  sortOrder: 0,
};
const exercise: Exercise = {
  id: 'e',
  subjectId: subject.id,
  number: 1,
  title: 'Движение',
  createdAt: '',
  updatedAt: '',
};
function attempt(
  isCorrect: boolean,
  solvedAt: string,
  exerciseId = exercise.id,
): Attempt {
  return {
    id: crypto.randomUUID(),
    exerciseId,
    isCorrect,
    solvedAt,
    subtopicId: null,
    description: null,
    myAnswer: null,
    correctAnswer: null,
    comment: null,
    createdAt: solvedAt,
    updatedAt: solvedAt,
  };
}

describe('Статистика по локальным дням', () => {
  it('показывает пустые дни и не создаёт точность без решений', () => {
    const result = dailyStatistics([], [], '2026-10-01', '2026-10-03');
    expect(result.days).toHaveLength(3);
    expect(
      result.days.every((day) => day.accuracy === null && day.total === 0),
    ).toBe(true);
    expect(result.accuracy).toBeNull();
  });
  it('считает правильные и ошибки, фильтрует период и предмет', () => {
    const second = { ...exercise, id: 'other', subjectId: 'other-subject' };
    const values = [
      attempt(true, '2026-10-02T12:00:00Z'),
      attempt(false, '2026-10-02T12:30:00Z'),
      attempt(true, '2026-10-01T12:00:00Z'),
      attempt(false, '2026-10-02T12:00:00Z', second.id),
    ];
    const result = dailyStatistics(
      values,
      [exercise, second],
      '2026-10-02',
      '2026-10-03',
      subject.id,
    );
    expect(result).toMatchObject({
      total: 2,
      correct: 1,
      incorrect: 1,
      accuracy: 0.5,
    });
    expect(result.days[0]).toMatchObject({ total: 2, accuracy: 0.5 });
  });
  it('группирует по календарю браузера, а не по UTC-префиксу', () => {
    const instant = new Date('2026-10-01T23:30:00Z');
    const local = localDayKey(instant);
    expect(
      dailyStatistics(
        [attempt(true, instant.toISOString())],
        [exercise],
        local,
        local,
      ).total,
    ).toBe(1);
  });
  it('правильно вычисляет диапазон через границу года', () => {
    expect(periodRange(new Date('2026-01-02T12:00:00').getTime(), 7)).toEqual({
      start: '2025-12-27',
      end: '2026-01-02',
    });
  });
  it('отклоняет неверные и чрезмерные диапазоны', () => {
    expect(() => dailyStatistics([], [], '2026-02-30', '2026-03-01')).toThrow();
    expect(() => dailyStatistics([], [], '2026-03-02', '2026-03-01')).toThrow();
    expect(() => dailyStatistics([], [], '2025-01-01', '2026-12-31')).toThrow(
      '366',
    );
  });
});

describe('Поиск и фильтры номеров', () => {
  const exercises = [
    exercise,
    { ...exercise, id: 'two', number: 2, title: 'Задание №2' },
  ];
  const now = Date.parse('2026-10-15T12:00:00Z');
  const progress = exerciseProgress(
    [subject],
    exercises,
    [],
    [attempt(false, '2026-10-01T12:00:00Z')],
    now,
  );
  it('ищет номер и название независимо от регистра', () => {
    expect(
      selectExercises(progress, 'math', 'ДВИЖ', 'all', 'number').map(
        (item) => item.id,
      ),
    ).toEqual(['e']);
    expect(
      selectExercises(progress, 'math', '2', 'all', 'number').map(
        (item) => item.id,
      ),
    ).toEqual(['two']);
  });
  it('разделяет не изученные, слабые и просроченные', () => {
    expect(
      selectExercises(progress, 'math', '', 'unseen', 'number').map(
        (item) => item.id,
      ),
    ).toEqual(['two']);
    expect(
      selectExercises(progress, 'math', '', 'practice', 'number').map(
        (item) => item.id,
      ),
    ).toEqual(['e']);
    expect(
      selectExercises(progress, 'math', '', 'due', 'priority').map(
        (item) => item.id,
      ),
    ).toEqual(['e']);
    expect(selectExercises(progress, 'russian', '', 'all', 'number')).toEqual(
      [],
    );
  });
});

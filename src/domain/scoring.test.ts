import { describe, expect, it } from 'vitest';
import {
  compareReviewPriority,
  exerciseProgress,
  masteryLevel,
  practiceMetrics,
  reviewInterval,
  reviewQueue,
  scoringConfig,
} from './scoring';
import type { Attempt, Exercise, Subject, Subtopic } from './entities';

const now = Date.parse('2026-10-15T12:00:00Z');
function attempt(
  correct: boolean,
  days = 0,
  id: string = crypto.randomUUID(),
): Attempt {
  const date = new Date(now - days * scoringConfig.dayMs).toISOString();
  return {
    id,
    exerciseId: 'exercise',
    subtopicId: null,
    isCorrect: correct,
    solvedAt: date,
    description: null,
    myAnswer: null,
    correctAnswer: null,
    comment: null,
    createdAt: date,
    updatedAt: date,
  };
}

describe('Оценка освоения v1', () => {
  it('пустая история не получает оценку или просроченное повторение', () => {
    expect(practiceMetrics([], now)).toMatchObject({
      total: 0,
      mastery: null,
      accuracy: null,
      weightedAccuracy: null,
      confidence: 0,
      reviewDue: false,
      level: 'Не изучено',
      reasons: [],
    });
  });
  it('точно следует формуле: ошибка 30 дней назад и правильный ответ сейчас', () => {
    const metrics = practiceMetrics([attempt(false, 30), attempt(true)], now);
    expect(metrics.accuracy).toBe(0.5);
    expect(metrics.weightedAccuracy).toBeCloseTo(2 / 3, 12);
    expect(metrics.confidence).toBeCloseTo(2 / 15, 12);
    expect(metrics.mastery).toBe(
      Math.round(100 * (2 / 3) * (0.65 + (0.35 * 2) / 15)),
    );
    expect(metrics.reviewDue).toBe(false);
  });
  it('свежие успехи перевешивают старые ошибки', () => {
    const metrics = practiceMetrics(
      [
        ...Array.from({ length: 15 }, () => attempt(false, 180)),
        ...Array.from({ length: 15 }, () => attempt(true)),
      ],
      now,
    );
    expect(metrics.weightedAccuracy).toBeGreaterThan(0.98);
    expect(metrics.level).toBe('Отлично');
    expect(metrics.accuracy).toBe(0.5);
  });
  it('давность включает повторение, сохраняя освоение', () => {
    const attempts = Array.from({ length: 15 }, () => attempt(true));
    const current = practiceMetrics(attempts, now);
    const later = practiceMetrics(attempts, now + 31 * scoringConfig.dayMs);
    expect(later.mastery).toBe(current.mastery);
    expect(later.level).toBe('Отлично');
    expect(later.reviewDue).toBe(true);
    expect(current.reviewDue).toBe(false);
  });
  it.each([
    [39, 'Слабая подготовка'],
    [40, 'Нужна практика'],
    [59, 'Нужна практика'],
    [60, 'Хорошо'],
    [79, 'Хорошо'],
    [80, 'Отлично'],
  ])('порог %s', (value, level) =>
    expect(masteryLevel(Number(value))).toBe(level),
  );
  it.each([
    [39, 1, 2],
    [40, 1, 3],
    [60, 1, 7],
    [80, 0.99, 14],
    [80, 1, 30],
  ])('интервал для %s / %s', (mastery, confidence, interval) =>
    expect(reviewInterval(mastery, confidence)).toBe(interval),
  );
  it('метка наступает точно на границе интервала', () => {
    const attempts = [attempt(false)];
    expect(
      practiceMetrics(attempts, now + 2 * scoringConfig.dayMs - 1).reviewDue,
    ).toBe(false);
    expect(
      practiceMetrics(attempts, now + 2 * scoringConfig.dayMs).reviewDue,
    ).toBe(true);
  });
  it('недостаток решений не подменяет просроченное повторение', () => {
    expect(practiceMetrics([attempt(true)], now)).toMatchObject({
      level: 'Хорошо',
      reviewDue: false,
      reasons: ['Мало решений'],
    });
  });
  it('порядок входа, одинаковые даты и редактирование не скрывают изменения', () => {
    const one = attempt(true, 10, 'a');
    const two = attempt(false, 10, 'b');
    expect(practiceMetrics([one, two], now)).toEqual(
      practiceMetrics([two, one], now),
    );
    expect(
      practiceMetrics([{ ...one, isCorrect: false }, two], now).mastery,
    ).toBe(0);
    expect(one.isCorrect).toBe(true);
  });
  it('учитывает дату решения, а не время внесения задним числом', () => {
    const old = {
      ...attempt(false, 90),
      createdAt: new Date(now).toISOString(),
    };
    expect(
      practiceMetrics([old, attempt(true)], now).weightedAccuracy,
    ).toBeCloseTo(8 / 9, 12);
  });
  it('объём ограничен 1, будущие записи не получают усиленный вес, древняя история остаётся конечной', () => {
    expect(
      practiceMetrics(
        Array.from({ length: 30 }, () => attempt(true)),
        now,
      ).confidence,
    ).toBe(1);
    expect(
      practiceMetrics([attempt(true, -30), attempt(false)], now)
        .weightedAccuracy,
    ).toBe(0.5);
    expect(
      practiceMetrics([attempt(true, 100_000), attempt(false, 100_030)], now)
        .weightedAccuracy,
    ).toBeCloseTo(2 / 3, 10);
  });
});

describe('Агрегаты и очередь', () => {
  const subject: Subject = {
    id: 'subject',
    code: 'math',
    title: 'Математика',
    sortOrder: 0,
  };
  const exercise: Exercise = {
    id: 'exercise',
    subjectId: subject.id,
    number: 1,
    title: 'Задание №1',
    createdAt: '',
    updatedAt: '',
  };
  const topic: Subtopic = {
    id: 'topic',
    exerciseId: exercise.id,
    title: 'Тема',
    sortOrder: 0,
    createdAt: '',
    updatedAt: '',
  };
  it('номер учитывает все решения, подтема только свои; очередь не дублирует номер', () => {
    const progress = exerciseProgress(
      [subject],
      [exercise],
      [topic],
      [attempt(true), { ...attempt(false, 20), subtopicId: topic.id }],
      now,
    );
    expect(progress[0]?.metrics.total).toBe(2);
    expect(progress[0]?.topics[0]?.metrics.total).toBe(1);
    expect(reviewQueue(progress)).toHaveLength(1);
    expect(reviewQueue(progress)[0]?.topics[0]?.metrics.reviewDue).toBe(true);
  });
  it('осиротевший предмет не включается, новые номера не попадают в повторение', () => {
    expect(exerciseProgress([], [exercise], [], [], now)).toEqual([]);
    expect(
      reviewQueue(exerciseProgress([subject], [exercise], [], [], now)),
    ).toEqual([]);
  });
  it('просроченные идут раньше свежих слабых; порядок стабилен', () => {
    const second = { ...exercise, id: 'second', number: 2 };
    const progress = exerciseProgress(
      [subject],
      [exercise, second],
      [],
      [attempt(false), { ...attempt(true, 50), exerciseId: second.id }],
      now,
    );
    expect(reviewQueue(progress)[0]?.id).toBe('second');
    expect(compareReviewPriority(progress[0]!, progress[0]!)).toBe(0);
  });
});

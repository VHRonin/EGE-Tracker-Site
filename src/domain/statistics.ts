import type { Attempt, Exercise } from './entities';
import type { ExerciseProgress } from './scoring';
import { compareReviewPriority } from './scoring';
import { ValidationError } from './validation';

export function selectExercises(
  progress: readonly ExerciseProgress[],
  code: string,
  search: string,
  filter: string,
  sort: string,
) {
  const term = search.normalize('NFC').trim().toLocaleLowerCase('ru');
  return progress
    .filter(
      (item) =>
        item.subject.code === code &&
        (!term ||
          String(item.number).includes(term) ||
          item.title.normalize('NFC').toLocaleLowerCase('ru').includes(term)) &&
        (filter === 'all' ||
          (filter === 'unseen' && item.metrics.total === 0) ||
          (filter === 'practice' &&
            item.metrics.mastery !== null &&
            item.metrics.mastery < 60) ||
          (filter === 'due' &&
            (item.metrics.reviewDue ||
              item.topics.some((topic) => topic.metrics.reviewDue)))),
    )
    .sort(
      sort === 'priority'
        ? compareReviewPriority
        : (a, b) => a.number - b.number,
    );
}

export function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function localDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new ValidationError('Выберите начало и конец периода.');
  const date = new Date(`${value}T12:00:00`);
  if (!Number.isFinite(date.getTime()) || localDayKey(date) !== value)
    throw new ValidationError('Укажите существующие даты.');
  return date;
}

export function periodRange(now: number, days: number) {
  const end = new Date(now);
  const start = new Date(now);
  start.setDate(start.getDate() - days + 1);
  return { start: localDayKey(start), end: localDayKey(end) };
}

export interface DailyPractice {
  date: string;
  correct: number;
  incorrect: number;
  total: number;
  accuracy: number | null;
}

export function dailyStatistics(
  attempts: readonly Attempt[],
  exercises: readonly Exercise[],
  start: string,
  end: string,
  subjectId?: string,
) {
  const first = localDate(start);
  const last = localDate(end);
  if (first > last)
    throw new ValidationError('Начало периода должно быть не позже конца.');
  const days: DailyPractice[] = [];
  const cursor = new Date(first);
  while (cursor <= last) {
    if (days.length >= 366)
      throw new ValidationError('Выберите период не длиннее 366 дней.');
    days.push({
      date: localDayKey(cursor),
      correct: 0,
      incorrect: 0,
      total: 0,
      accuracy: null,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  const byDate = new Map(days.map((day) => [day.date, day]));
  const ids = new Set(
    exercises
      .filter((exercise) => !subjectId || exercise.subjectId === subjectId)
      .map((exercise) => exercise.id),
  );
  for (const attempt of attempts) {
    if (!ids.has(attempt.exerciseId)) continue;
    const day = byDate.get(localDayKey(new Date(attempt.solvedAt)));
    if (!day) continue;
    if (attempt.isCorrect) day.correct++;
    else day.incorrect++;
    day.total++;
  }
  for (const day of days)
    day.accuracy = day.total ? day.correct / day.total : null;
  const total = days.reduce((sum, day) => sum + day.total, 0);
  const correct = days.reduce((sum, day) => sum + day.correct, 0);
  return {
    days,
    total,
    correct,
    incorrect: total - correct,
    accuracy: total ? correct / total : null,
  };
}

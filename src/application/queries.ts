import { useLiveQuery } from 'dexie-react-hooks';
import { tracker } from './tracker';
import { useMemo } from 'react';
import { exerciseProgress, reviewQueue } from '../domain/scoring';
import { useNow } from './useNow';
import {
  dailyStatistics,
  periodRange,
  selectExercises,
} from '../domain/statistics';
import { ValidationError } from '../domain/validation';

export type QueryState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T };

function useQuery<T>(query: () => Promise<T>, key: string): QueryState<T> {
  const result = useLiveQuery(async () => {
    try {
      return { key, status: 'ready' as const, data: await query() };
    } catch {
      return {
        key,
        status: 'error' as const,
        message:
          'Не удалось открыть локальные данные. Разрешите хранение данных для сайта и обновите страницу. Уже сохранённые записи не удаляются.',
      };
    }
  }, [key]);
  return !result || result.key !== key ? { status: 'loading' } : result;
}

export const useSubjects = () => useQuery(tracker.subjects, 'subjects');
export const useRecentAttempts = () => useQuery(tracker.recent, 'recent');
export const useSubject = (code: string) =>
  useQuery(() => tracker.subject(code), `subject:${code}`);
export const useExercise = (id: string, code: string) =>
  useQuery(() => tracker.exercise(id, code), `exercise:${code}:${id}`);

export function useProgress() {
  const query = useQuery(tracker.progressData, 'progress');
  const now = useNow();
  return useMemo(() => {
    if (query.status !== 'ready') return query;
    const { subjects, exercises, subtopics, attempts } = query.data;
    const progress = exerciseProgress(
      subjects,
      exercises,
      subtopics,
      attempts,
      now,
    );
    return {
      status: 'ready' as const,
      data: { ...query.data, progress, queue: reviewQueue(progress), now },
    };
  }, [query, now]);
}

export function useSubjectAnalysis(
  code: string,
  search: string,
  filter: string,
  sort: string,
) {
  const query = useProgress();
  return useMemo(() => {
    if (query.status !== 'ready') return query;
    const subject = query.data.subjects.find((item) => item.code === code);
    return {
      status: 'ready' as const,
      data: subject
        ? {
            subject,
            exercises: selectExercises(
              query.data.progress,
              code,
              search,
              filter,
              sort,
            ),
            totalExercises: query.data.progress.filter(
              (item) => item.subject.id === subject.id,
            ).length,
          }
        : null,
    };
  }, [query, code, search, filter, sort]);
}

export function useStatistics(
  code: string,
  period: string,
  start: string,
  end: string,
) {
  const query = useQuery(tracker.progressData, 'progress');
  const now = useNow();
  return useMemo(() => {
    if (query.status !== 'ready') return query;
    try {
      const range =
        period === 'custom' ? { start, end } : periodRange(now, Number(period));
      const subject = query.data.subjects.find((item) => item.code === code);
      const statistics = dailyStatistics(
        query.data.attempts,
        query.data.exercises,
        range.start,
        range.end,
        subject?.id,
      );
      return {
        status: 'ready' as const,
        data: { ...statistics, range, subjects: query.data.subjects },
      };
    } catch (error) {
      return {
        status: 'error' as const,
        message:
          error instanceof ValidationError
            ? error.message
            : 'Не удалось построить статистику.',
      };
    }
  }, [query, now, code, period, start, end]);
}

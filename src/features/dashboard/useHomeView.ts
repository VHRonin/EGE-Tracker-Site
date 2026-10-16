import { useMemo } from 'react';
import { useProgress } from '../../application/queries';
import { dailyStatistics, periodRange } from '../../domain/statistics';
import { reviewPriority } from '../../domain/scoring';

// Presentation model only: reuse the existing domain functions and never write data.
export function useHomeView() {
  const query = useProgress();
  return useMemo(() => {
    if (query.status !== 'ready') return query;
    const { attempts, exercises, subjects, queue, now } = query.data;
    const range = periodRange(now, 7);
    const weekly = dailyStatistics(attempts, exercises, range.start, range.end);
    const correct = attempts.filter((attempt) => attempt.isCorrect).length;
    const sorted = [...attempts].sort(
      (a, b) =>
        b.solvedAt.localeCompare(a.solvedAt) || b.id.localeCompare(a.id),
    );
    const byExercise = new Map(
      exercises.map((exercise) => [exercise.id, exercise]),
    );
    return {
      status: 'ready' as const,
      data: {
        total: attempts.length,
        correct,
        incorrect: attempts.length - correct,
        accuracy: attempts.length ? correct / attempts.length : null,
        due: queue.filter((item) => reviewPriority(item).due).length,
        queue: queue.slice(0, 3),
        weekly,
        lastSolvedAt: sorted[0]?.solvedAt ?? null,
        subjects: subjects.map((subject) => {
          const ids = new Set(
            exercises
              .filter((exercise) => exercise.subjectId === subject.id)
              .map((exercise) => exercise.id),
          );
          const records = attempts.filter((attempt) =>
            ids.has(attempt.exerciseId),
          );
          return {
            ...subject,
            total: records.length,
            accuracy: records.length
              ? records.filter((attempt) => attempt.isCorrect).length /
                records.length
              : null,
          };
        }),
        recent: sorted.slice(0, 5).flatMap((attempt) => {
          const exercise = byExercise.get(attempt.exerciseId);
          const subject = subjects.find(
            (item) => item.id === exercise?.subjectId,
          );
          return exercise && subject ? [{ ...attempt, exercise, subject }] : [];
        }),
      },
    };
  }, [query]);
}

export type HomeView = Extract<
  ReturnType<typeof useHomeView>,
  { status: 'ready' }
>['data'];

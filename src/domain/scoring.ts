import type { Attempt, Exercise, Subject, Subtopic } from './entities';

export const scoringConfig = {
  dayMs: 86_400_000,
  halfLifeDays: 30,
  sufficientAttempts: 15,
  accuracyShare: 0.65,
  confidenceShare: 0.35,
  recommendationAccuracy: 0.6,
  thresholds: [40, 60, 80],
  reviewIntervals: [2, 3, 7, 14, 30],
} as const;
export type MasteryLevel =
  'Не изучено' | 'Слабая подготовка' | 'Нужна практика' | 'Хорошо' | 'Отлично';
export interface PracticeMetrics {
  total: number;
  correct: number;
  incorrect: number;
  accuracy: number | null;
  weightedAccuracy: number | null;
  confidence: number;
  mastery: number | null;
  level: MasteryLevel;
  lastSolvedAt: string | null;
  daysSinceLast: number | null;
  intervalDays: number | null;
  reviewAt: string | null;
  reviewDue: boolean;
  reasons: string[];
}

export function masteryLevel(mastery: number | null): MasteryLevel {
  if (mastery === null) return 'Не изучено';
  if (mastery < scoringConfig.thresholds[0]) return 'Слабая подготовка';
  if (mastery < scoringConfig.thresholds[1]) return 'Нужна практика';
  if (mastery < scoringConfig.thresholds[2]) return 'Хорошо';
  return 'Отлично';
}

export function reviewInterval(mastery: number, confidence: number): number {
  const intervals = scoringConfig.reviewIntervals;
  if (mastery < scoringConfig.thresholds[0]) return intervals[0];
  if (mastery < scoringConfig.thresholds[1]) return intervals[1];
  if (mastery < scoringConfig.thresholds[2]) return intervals[2];
  return confidence < 1 ? intervals[3] : intervals[4];
}

export function practiceMetrics(
  attempts: readonly Pick<Attempt, 'id' | 'isCorrect' | 'solvedAt'>[],
  now: number,
): PracticeMetrics {
  const ordered = [...attempts].sort(
    (a, b) => a.solvedAt.localeCompare(b.solvedAt) || a.id.localeCompare(b.id),
  );
  const total = ordered.length;
  const correct = ordered.filter((attempt) => attempt.isCorrect).length;
  if (!total)
    return {
      total,
      correct,
      incorrect: 0,
      accuracy: null,
      weightedAccuracy: null,
      confidence: 0,
      mastery: null,
      level: 'Не изучено',
      lastSolvedAt: null,
      daysSinceLast: null,
      intervalDays: null,
      reviewAt: null,
      reviewDue: false,
      reasons: [],
    };
  const logarithms = ordered.map(
    (attempt) =>
      -Math.max(0, now - Date.parse(attempt.solvedAt)) /
      scoringConfig.dayMs /
      scoringConfig.halfLifeDays,
  );
  // Divide all w_i by their largest value: A is unchanged and ancient histories avoid 0/0.
  const maximum = logarithms.reduce(
    (maximum, value) => Math.max(maximum, value),
    -Infinity,
  );
  let weights = 0;
  let successes = 0;
  ordered.forEach((attempt, index) => {
    const weight = 2 ** (logarithms[index]! - maximum);
    weights += weight;
    if (attempt.isCorrect) successes += weight;
  });
  const weightedAccuracy = successes / weights;
  const confidence = Math.min(1, total / scoringConfig.sufficientAttempts);
  const mastery = Math.round(
    100 *
      weightedAccuracy *
      (scoringConfig.accuracyShare +
        scoringConfig.confidenceShare * confidence),
  );
  const lastSolvedAt = ordered.at(-1)!.solvedAt;
  const daysSinceLast = Math.max(
    0,
    (now - Date.parse(lastSolvedAt)) / scoringConfig.dayMs,
  );
  const intervalDays = reviewInterval(mastery, confidence);
  const reviewDue = daysSinceLast >= intervalDays;
  const reasons = [
    reviewDue ? 'Давно не практиковался' : '',
    weightedAccuracy < scoringConfig.recommendationAccuracy
      ? 'Низкая точность'
      : '',
    confidence < 1 ? 'Мало решений' : '',
  ].filter(Boolean);
  return {
    total,
    correct,
    incorrect: total - correct,
    accuracy: correct / total,
    weightedAccuracy,
    confidence,
    mastery,
    level: masteryLevel(mastery),
    lastSolvedAt,
    daysSinceLast,
    intervalDays,
    reviewAt: new Date(
      Date.parse(lastSolvedAt) + intervalDays * scoringConfig.dayMs,
    ).toISOString(),
    reviewDue,
    reasons,
  };
}

export interface ExerciseProgress extends Exercise {
  subject: Subject;
  metrics: PracticeMetrics;
  topics: Array<Subtopic & { metrics: PracticeMetrics }>;
}

export function exerciseProgress(
  subjects: readonly Subject[],
  exercises: readonly Exercise[],
  topics: readonly Subtopic[],
  attempts: readonly Attempt[],
  now: number,
): ExerciseProgress[] {
  const byExercise = new Map<string, Attempt[]>();
  const byTopic = new Map<string, Attempt[]>();
  for (const attempt of attempts) {
    const list = byExercise.get(attempt.exerciseId) ?? [];
    list.push(attempt);
    byExercise.set(attempt.exerciseId, list);
    if (attempt.subtopicId) {
      const group = byTopic.get(attempt.subtopicId) ?? [];
      group.push(attempt);
      byTopic.set(attempt.subtopicId, group);
    }
  }
  return exercises.flatMap((exercise) => {
    const subject = subjects.find((item) => item.id === exercise.subjectId);
    if (!subject) return [];
    return [
      {
        ...exercise,
        subject,
        metrics: practiceMetrics(byExercise.get(exercise.id) ?? [], now),
        topics: topics
          .filter((topic) => topic.exerciseId === exercise.id)
          .map((topic) => ({
            ...topic,
            metrics: practiceMetrics(byTopic.get(topic.id) ?? [], now),
          })),
      },
    ];
  });
}

export function reviewPriority(item: ExerciseProgress) {
  const metrics = [item.metrics, ...item.topics.map((topic) => topic.metrics)];
  return {
    due: metrics.some((metric) => metric.reviewDue),
    overdue: Math.max(
      ...metrics.map((metric) =>
        metric.daysSinceLast === null
          ? 0
          : metric.daysSinceLast / (metric.intervalDays ?? 1),
      ),
    ),
    mastery: Math.min(
      ...metrics
        .filter((metric) => metric.mastery !== null)
        .map((metric) => metric.mastery!),
    ),
  };
}

export function compareReviewPriority(
  a: ExerciseProgress,
  b: ExerciseProgress,
) {
  const first = reviewPriority(a);
  const second = reviewPriority(b);
  return (
    Number(second.due) - Number(first.due) ||
    second.overdue - first.overdue ||
    first.mastery - second.mastery ||
    a.subject.sortOrder - b.subject.sortOrder ||
    a.number - b.number ||
    a.id.localeCompare(b.id)
  );
}

export function reviewQueue(progress: readonly ExerciseProgress[]) {
  return progress
    .filter(
      (item) =>
        item.metrics.total > 0 &&
        (item.metrics.reasons.length > 0 ||
          item.topics.some((topic) => topic.metrics.reasons.length > 0)),
    )
    .sort(compareReviewPriority);
}

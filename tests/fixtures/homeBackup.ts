import type { BackupFile } from '../../src/domain/backup';

// Local Moscow midnight is crossed by the latest UTC timestamp.
export const homeNow = '2026-10-15T22:30:00.000Z';
export function homeBackup(): BackupFile {
  const subjects = [
    {
      id: crypto.randomUUID(),
      code: 'math' as const,
      title: 'Математика',
      sortOrder: 0,
    },
    {
      id: crypto.randomUUID(),
      code: 'russian' as const,
      title: 'Русский язык',
      sortOrder: 1,
    },
    {
      id: crypto.randomUUID(),
      code: 'informatics' as const,
      title: 'Информатика',
      sortOrder: 2,
    },
  ];
  const exercises = subjects.map((subject, index) => ({
    id: crypto.randomUUID(),
    subjectId: subject.id,
    number: index + 1,
    title: ['Планиметрия', 'Ударения', 'Алгоритмы'][index]!,
    createdAt: homeNow,
    updatedAt: homeNow,
  }));
  const records = [
    [0, true, '2026-10-15T21:15:00.000Z'],
    [0, false, '2026-10-15T19:30:00.000Z'],
    [2, true, '2026-10-14T23:00:00.000Z'],
    [1, true, '2026-10-10T06:00:00.000Z'],
    [0, false, '2026-10-09T20:00:00.000Z'],
  ] as const;
  return {
    schemaVersion: 1,
    exportedAt: homeNow,
    subjects,
    exercises,
    subtopics: [],
    attachments: [],
    attempts: records.map(([exercise, isCorrect, solvedAt]) => ({
      id: crypto.randomUUID(),
      exerciseId: exercises[exercise]!.id,
      subtopicId: null,
      isCorrect,
      solvedAt,
      description: null,
      myAnswer: null,
      correctAnswer: null,
      comment: null,
      createdAt: homeNow,
      updatedAt: homeNow,
    })),
  };
}

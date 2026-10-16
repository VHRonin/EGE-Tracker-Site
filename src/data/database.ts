import Dexie from 'dexie';
import type { Table } from 'dexie';
import { initialExerciseTitles, initialExerciseCounts } from './defaultCatalog';
export { initialExerciseCounts } from './defaultCatalog';
import type {
  Attachment,
  Attempt,
  Exercise,
  Subject,
  Subtopic,
} from '../domain/entities';

export const initialSubjects: readonly Subject[] = [
  {
    id: 'b803b082-5dc5-4d41-9147-4a64b32c99e1',
    code: 'math',
    title: 'Математика',
    sortOrder: 0,
  },
  {
    id: 'e85fd8ae-3ab8-4ccf-8bf4-d37e9f5737f2',
    code: 'russian',
    title: 'Русский язык',
    sortOrder: 1,
  },
  {
    id: '56f7a18d-a1d2-426f-9239-a1b82937a2a3',
    code: 'informatics',
    title: 'Информатика',
    sortOrder: 2,
  },
];

export class TrackerDatabase extends Dexie {
  subjects!: Table<Subject, string>;
  exercises!: Table<Exercise, string>;
  subtopics!: Table<Subtopic, string>;
  attempts!: Table<Attempt, string>;
  attachments!: Table<Attachment, string>;

  constructor(name = 'ege-tracker') {
    super(name);
    this.version(1).stores({
      subjects: 'id, &code, sortOrder',
      exercises: 'id, subjectId, &[subjectId+number]',
      subtopics: 'id, exerciseId, [exerciseId+sortOrder]',
      attempts:
        'id, exerciseId, subtopicId, solvedAt, [exerciseId+solvedAt], [subtopicId+solvedAt]',
      attachments: 'id, &attemptId',
    });
    this.version(2)
      .stores({})
      .upgrade(async (transaction) => {
        const subjects = await transaction.table<Subject>('subjects').toArray();
        const exercises = transaction.table<Exercise>('exercises');
        const now = new Date().toISOString();
        for (const subject of subjects) {
          const titles = initialExerciseTitles[subject.code];
          for (const exercise of await exercises
            .where('subjectId')
            .equals(subject.id)
            .toArray()) {
            const title = titles[exercise.number - 1];
            if (title && exercise.title === `Задание №${exercise.number}`) {
              await exercises.update(exercise.id, { title, updatedAt: now });
            }
          }
          // Only this number is new to the supplied defaults. Never recreate deleted old numbers.
          if (
            subject.code === 'math' &&
            !(await exercises
              .where('[subjectId+number]')
              .equals([subject.id, 20])
              .count())
          ) {
            await exercises.add({
              id: crypto.randomUUID(),
              subjectId: subject.id,
              number: 20,
              title: initialExerciseTitles.math[19],
              createdAt: now,
              updatedAt: now,
            });
          }
        }
      });
    this.on('populate', async (transaction) => {
      const now = new Date().toISOString();
      await transaction
        .table<Subject>('subjects')
        .bulkAdd([...initialSubjects]);
      await transaction.table<Exercise>('exercises').bulkAdd(
        initialSubjects.flatMap((subject) =>
          Array.from(
            { length: initialExerciseCounts[subject.code] },
            (_, index) => ({
              id: crypto.randomUUID(),
              subjectId: subject.id,
              number: index + 1,
              title: initialExerciseTitles[subject.code][index]!,
              createdAt: now,
              updatedAt: now,
            }),
          ),
        ),
      );
    });
  }
}

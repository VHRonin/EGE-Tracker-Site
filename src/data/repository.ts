import type {
  Attempt,
  AttemptInput,
  Exercise,
  ImageChange,
  SubjectCode,
} from '../domain/entities';
import {
  attemptFields,
  batchCounts,
  isoDate,
  positiveInteger,
  titleValue,
  uuid,
  ValidationError,
} from '../domain/validation';
import { validateImage } from '../domain/images';
import { TrackerDatabase } from './database';

export class TrackerRepository {
  constructor(readonly db: TrackerDatabase) {}

  async progressData() {
    return this.db.transaction(
      'r',
      [
        this.db.subjects,
        this.db.exercises,
        this.db.subtopics,
        this.db.attempts,
      ],
      async () => ({
        subjects: await this.db.subjects.orderBy('sortOrder').toArray(),
        exercises: await this.db.exercises.toArray(),
        subtopics: await this.db.subtopics.toArray(),
        attempts: await this.db.attempts.toArray(),
      }),
    );
  }

  async requireExercise(id: string) {
    const exercise = await this.db.exercises.get(uuid(id));
    if (!exercise)
      throw new ValidationError(
        'Номер больше не существует. Вернитесь к списку предметов.',
      );
    return exercise;
  }

  private async checkSubtopic(exerciseId: string, subtopicId: string | null) {
    if (subtopicId === null) return;
    const topic = await this.db.subtopics.get(uuid(subtopicId));
    if (!topic || topic.exerciseId !== exerciseId)
      throw new ValidationError(
        'Подтема не найдена или принадлежит другому номеру.',
      );
  }

  async subjectsOverview() {
    return this.db.transaction(
      'r',
      [this.db.subjects, this.db.exercises, this.db.attempts],
      async () => {
        const subjects = await this.db.subjects.orderBy('sortOrder').toArray();
        const exercises = await this.db.exercises.toArray();
        const attempts = await this.db.attempts.toArray();
        return subjects.map((subject) => {
          const ids = new Set(
            exercises
              .filter((exercise) => exercise.subjectId === subject.id)
              .map((exercise) => exercise.id),
          );
          return {
            ...subject,
            exerciseCount: ids.size,
            attemptCount: attempts.filter((attempt) =>
              ids.has(attempt.exerciseId),
            ).length,
          };
        });
      },
    );
  }

  async subjectPage(code: string) {
    return this.db.transaction(
      'r',
      [this.db.subjects, this.db.exercises, this.db.attempts],
      async () => {
        const subject = await this.db.subjects
          .where('code')
          .equals(code)
          .first();
        if (!subject) return null;
        const exercises = await this.db.exercises
          .where('subjectId')
          .equals(subject.id)
          .sortBy('number');
        const items = await Promise.all(
          exercises.map(async (exercise) => ({
            ...exercise,
            attemptCount: await this.db.attempts
              .where('exerciseId')
              .equals(exercise.id)
              .count(),
          })),
        );
        return { subject, exercises: items };
      },
    );
  }

  async exercisePage(id: string, code: string) {
    return this.db.transaction(
      'r',
      [
        this.db.subjects,
        this.db.exercises,
        this.db.subtopics,
        this.db.attempts,
        this.db.attachments,
      ],
      async () => {
        const exercise = await this.db.exercises.get(id);
        if (!exercise) return null;
        const subject = await this.db.subjects.get(exercise.subjectId);
        if (!subject || subject.code !== code) return null;
        const subtopics = await this.db.subtopics
          .where('exerciseId')
          .equals(id)
          .sortBy('sortOrder');
        const attempts = await this.db.attempts
          .where('exerciseId')
          .equals(id)
          .toArray();
        attempts.sort(
          (a, b) =>
            b.solvedAt.localeCompare(a.solvedAt) || b.id.localeCompare(a.id),
        );
        // Only this exercise's attachments are loaded; object URLs are created on demand.
        const attachments = await this.db.attachments
          .where('attemptId')
          .anyOf(attempts.map((a) => a.id))
          .toArray();
        return {
          subject,
          exercise,
          subtopics,
          attempts: attempts.map((attempt) => ({
            ...attempt,
            attachment:
              attachments.find((image) => image.attemptId === attempt.id) ??
              null,
          })),
        };
      },
    );
  }

  async saveExercise(
    subjectId: string,
    number: number,
    title: string,
    id?: string,
  ): Promise<Exercise> {
    const safeNumber = positiveInteger(number);
    const safeTitle = titleValue(title);
    return this.db.transaction(
      'rw',
      [this.db.subjects, this.db.exercises],
      async () => {
        if (!(await this.db.subjects.get(uuid(subjectId))))
          throw new ValidationError('Предмет не найден.');
        const previous = id ? await this.requireExercise(id) : undefined;
        if (previous && previous.subjectId !== subjectId)
          throw new ValidationError(
            'Нельзя переместить номер в другой предмет.',
          );
        const now = new Date().toISOString();
        const exercise = {
          id: previous?.id ?? crypto.randomUUID(),
          subjectId,
          number: safeNumber,
          title: safeTitle,
          createdAt: previous?.createdAt ?? now,
          updatedAt: now,
        };
        await this.db.exercises.put(exercise);
        return exercise;
      },
    );
  }

  async saveSubtopic(exerciseId: string, title: string, id?: string) {
    const safeTitle = titleValue(title);
    return this.db.transaction(
      'rw',
      [this.db.exercises, this.db.subtopics],
      async () => {
        await this.requireExercise(exerciseId);
        const previous = id ? await this.db.subtopics.get(uuid(id)) : undefined;
        if (id && (!previous || previous.exerciseId !== exerciseId))
          throw new ValidationError('Подтема не найдена.');
        const topics = await this.db.subtopics
          .where('exerciseId')
          .equals(exerciseId)
          .toArray();
        const now = new Date().toISOString();
        const topic = {
          id: previous?.id ?? crypto.randomUUID(),
          exerciseId,
          title: safeTitle,
          sortOrder:
            previous?.sortOrder ??
            Math.max(-1, ...topics.map((t) => t.sortOrder)) + 1,
          createdAt: previous?.createdAt ?? now,
          updatedAt: now,
        };
        await this.db.subtopics.put(topic);
        return topic;
      },
    );
  }

  async deleteSubtopic(id: string) {
    return this.db.transaction(
      'rw',
      [this.db.subtopics, this.db.attempts],
      async () => {
        if (!(await this.db.subtopics.get(uuid(id))))
          throw new ValidationError('Подтема уже удалена.');
        await this.db.attempts
          .where('subtopicId')
          .equals(id)
          .modify({ subtopicId: null, updatedAt: new Date().toISOString() });
        await this.db.subtopics.delete(id);
      },
    );
  }

  async saveAttempt(input: AttemptInput, image?: ImageChange, id?: string) {
    const now = new Date().toISOString();
    const fields = attemptFields(input, now);
    // File IO happens before the transaction so IndexedDB cannot auto-commit mid-read.
    const preparedImage = image ? await validateImage(image) : image;
    return this.db.transaction(
      'rw',
      [
        this.db.exercises,
        this.db.subtopics,
        this.db.attempts,
        this.db.attachments,
      ],
      async () => {
        await this.requireExercise(fields.exerciseId);
        await this.checkSubtopic(fields.exerciseId, fields.subtopicId);
        const previous = id ? await this.db.attempts.get(uuid(id)) : undefined;
        if (id && (!previous || previous.exerciseId !== fields.exerciseId))
          throw new ValidationError('Решение не найдено. Обновите историю.');
        const attempt: Attempt = {
          ...fields,
          id: previous?.id ?? crypto.randomUUID(),
          createdAt: previous?.createdAt ?? now,
          updatedAt: now,
        };
        await this.db.attempts.put(attempt);
        if (preparedImage !== undefined) {
          await this.db.attachments
            .where('attemptId')
            .equals(attempt.id)
            .delete();
          if (preparedImage)
            await this.db.attachments.add({
              ...preparedImage,
              id: crypto.randomUUID(),
              attemptId: attempt.id,
              createdAt: now,
            });
        }
        return attempt;
      },
    );
  }

  async addBatch(
    exerciseId: string,
    correct: number,
    incorrect: number,
    subtopicId: string | null = null,
    solvedAt = new Date().toISOString(),
  ) {
    batchCounts(correct, incorrect);
    const date = isoDate(solvedAt);
    return this.db.transaction(
      'rw',
      [this.db.exercises, this.db.subtopics, this.db.attempts],
      async () => {
        await this.requireExercise(exerciseId);
        await this.checkSubtopic(exerciseId, subtopicId);
        const now = new Date().toISOString();
        const attempts = Array.from(
          { length: correct + incorrect },
          (_, index) => ({
            ...attemptFields(
              {
                exerciseId,
                subtopicId,
                solvedAt: date,
                isCorrect: index < correct,
              },
              now,
            ),
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
          }),
        );
        await this.db.attempts.bulkAdd(attempts);
        return attempts;
      },
    );
  }

  async deleteAttempt(id: string) {
    return this.db.transaction(
      'rw',
      [this.db.attempts, this.db.attachments],
      async () => {
        await this.db.attachments.where('attemptId').equals(uuid(id)).delete();
        await this.db.attempts.delete(id);
      },
    );
  }

  async deleteExercise(id: string) {
    return this.db.transaction(
      'rw',
      [
        this.db.exercises,
        this.db.subtopics,
        this.db.attempts,
        this.db.attachments,
      ],
      async () => {
        await this.requireExercise(id);
        const attemptIds = await this.db.attempts
          .where('exerciseId')
          .equals(id)
          .primaryKeys();
        await this.db.attachments.where('attemptId').anyOf(attemptIds).delete();
        await this.db.attempts.bulkDelete(attemptIds);
        await this.db.subtopics.where('exerciseId').equals(id).delete();
        await this.db.exercises.delete(id);
      },
    );
  }

  async recentAttempts() {
    return this.db.transaction(
      'r',
      [this.db.attempts, this.db.exercises, this.db.subjects],
      async () => {
        const attempts = await this.db.attempts
          .orderBy('solvedAt')
          .reverse()
          .limit(5)
          .toArray();
        return Promise.all(
          attempts.map(async (attempt) => {
            const exercise = await this.db.exercises.get(attempt.exerciseId);
            const subject = exercise
              ? await this.db.subjects.get(exercise.subjectId)
              : undefined;
            return {
              ...attempt,
              exerciseTitle: exercise?.title ?? 'Номер удалён',
              subjectCode: subject?.code ?? ('math' as SubjectCode),
              subjectTitle: subject?.title ?? '',
            };
          }),
        );
      },
    );
  }
}

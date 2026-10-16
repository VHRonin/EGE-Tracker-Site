import type { DataSnapshot } from '../domain/backup';
import { TrackerDatabase } from './database';
import { initialSubjects } from './database';
import { initialExerciseTitles, initialExerciseCounts } from './defaultCatalog';

export class BackupRepository {
  constructor(readonly db: TrackerDatabase) {}

  async snapshot(): Promise<DataSnapshot> {
    return this.db.transaction('r', this.db.tables, async () => ({
      subjects: await this.db.subjects.toArray(),
      exercises: await this.db.exercises.toArray(),
      subtopics: await this.db.subtopics.toArray(),
      attempts: await this.db.attempts.toArray(),
      attachments: await this.db.attachments.toArray(),
    }));
  }

  async replace(data: DataSnapshot) {
    return this.db.transaction('rw', this.db.tables, async () => {
      for (const table of this.db.tables) await table.clear();
      await this.db.subjects.bulkAdd(data.subjects);
      await this.db.exercises.bulkAdd(data.exercises);
      await this.db.subtopics.bulkAdd(data.subtopics);
      await this.db.attempts.bulkAdd(data.attempts);
      await this.db.attachments.bulkAdd(data.attachments);
    });
  }

  async reset() {
    const now = new Date().toISOString();
    return this.replace({
      subjects: [...initialSubjects],
      exercises: initialSubjects.flatMap((subject) =>
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
      subtopics: [],
      attempts: [],
      attachments: [],
    });
  }
}

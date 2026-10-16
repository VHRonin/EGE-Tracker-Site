import { TrackerRepository } from '../data/repository';
import type { AttemptInput, ImageChange } from '../domain/entities';

import { database } from './storage';
export { prepareScreenshot } from './images';
const repository = new TrackerRepository(database);

export const tracker = {
  progressData: () => repository.progressData(),
  subjects: () => repository.subjectsOverview(),
  subject: (code: string) => repository.subjectPage(code),
  exercise: (id: string, code: string) => repository.exercisePage(id, code),
  recent: () => repository.recentAttempts(),
  saveExercise: (
    subjectId: string,
    number: number,
    title: string,
    id?: string,
  ) => repository.saveExercise(subjectId, number, title, id),
  deleteExercise: (id: string) => repository.deleteExercise(id),
  saveSubtopic: (exerciseId: string, title: string, id?: string) =>
    repository.saveSubtopic(exerciseId, title, id),
  deleteSubtopic: (id: string) => repository.deleteSubtopic(id),
  saveAttempt: (input: AttemptInput, image: ImageChange, id?: string) =>
    repository.saveAttempt(input, image, id),
  deleteAttempt: (id: string) => repository.deleteAttempt(id),
  addBatch: (
    exerciseId: string,
    correct: number,
    incorrect: number,
    subtopicId: string | null,
    solvedAt: string,
  ) =>
    repository.addBatch(exerciseId, correct, incorrect, subtopicId, solvedAt),
};

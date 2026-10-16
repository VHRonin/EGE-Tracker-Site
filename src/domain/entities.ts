export type SubjectCode = 'math' | 'russian' | 'informatics';
export interface Subject {
  id: string;
  code: SubjectCode;
  title: string;
  sortOrder: number;
}
export interface Exercise {
  id: string;
  subjectId: string;
  number: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}
export interface Subtopic {
  id: string;
  exerciseId: string;
  title: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
export interface Attempt {
  id: string;
  exerciseId: string;
  subtopicId: string | null;
  isCorrect: boolean;
  solvedAt: string;
  description: string | null;
  myAnswer: string | null;
  correctAnswer: string | null;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface Attachment {
  id: string;
  attemptId: string;
  filename: string;
  mimeType: string;
  size: number;
  blob: Blob;
  createdAt: string;
}
export type AttemptInput = Pick<Attempt, 'exerciseId' | 'isCorrect'> &
  Partial<
    Pick<
      Attempt,
      | 'subtopicId'
      | 'solvedAt'
      | 'description'
      | 'myAnswer'
      | 'correctAnswer'
      | 'comment'
    >
  >;
export type ImageInput = Pick<
  Attachment,
  'filename' | 'mimeType' | 'size' | 'blob'
>;
// undefined preserves the current attachment; null explicitly removes it.
export type ImageChange = ImageInput | null | undefined;

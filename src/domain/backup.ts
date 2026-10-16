import { z } from 'zod';
import type {
  Attachment,
  Attempt,
  Exercise,
  Subject,
  Subtopic,
} from './entities';
import { validateImage } from './images';
import { isoDate, limits, textValue, ValidationError } from './validation';

export const backupLimits = {
  fileBytes: 256 * 1024 * 1024,
  decodedImageBytes: 128 * 1024 * 1024,
  entitiesPerTable: 200_000,
} as const;
const id = z.string().uuid();
const date = z.string().refine((value) => {
  try {
    isoDate(value);
    return true;
  } catch {
    return false;
  }
}, 'Некорректная дата ISO UTC');
const text = (max: number) =>
  z
    .string()
    .max(max)
    .refine((value) => {
      try {
        textValue(value, max, 'Текст');
        return true;
      } catch {
        return false;
      }
    });
const title = text(limits.title).refine((value) => value.trim().length > 0);
const number = z.number().int().min(1).max(999);
const order = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const timestamps = { createdAt: date, updatedAt: date };
const subjectSchema = z
  .object({
    id,
    code: z.enum(['math', 'russian', 'informatics']),
    title,
    sortOrder: order,
  })
  .strict();
const exerciseSchema = z
  .object({ id, subjectId: id, number, title, ...timestamps })
  .strict();
const topicSchema = z
  .object({ id, exerciseId: id, title, sortOrder: order, ...timestamps })
  .strict();
const attemptSchema = z
  .object({
    id,
    exerciseId: id,
    subtopicId: id.nullable(),
    isCorrect: z.boolean(),
    solvedAt: date,
    description: text(limits.description).nullable(),
    myAnswer: text(limits.answer).nullable(),
    correctAnswer: text(limits.answer).nullable(),
    comment: text(limits.comment).nullable(),
    ...timestamps,
  })
  .strict();
const imageSchema = z
  .object({
    id,
    attemptId: id,
    filename: text(255).min(1),
    mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
    size: z.number().int().positive().max(limits.imageBytes),
    base64: z.string().max(4 * Math.ceil(limits.imageBytes / 3)),
    createdAt: date,
  })
  .strict();
const schema = z
  .object({
    schemaVersion: z.literal(1),
    exportedAt: date,
    subjects: z.array(subjectSchema).length(3),
    exercises: z.array(exerciseSchema).max(backupLimits.entitiesPerTable),
    subtopics: z.array(topicSchema).max(backupLimits.entitiesPerTable),
    attempts: z.array(attemptSchema).max(backupLimits.entitiesPerTable),
    attachments: z.array(imageSchema).max(backupLimits.entitiesPerTable),
  })
  .strict();
export type BackupFile = z.infer<typeof schema>;
export interface DataSnapshot {
  subjects: Subject[];
  exercises: Exercise[];
  subtopics: Subtopic[];
  attempts: Attempt[];
  attachments: Attachment[];
}
export interface PreparedBackup {
  data: DataSnapshot;
  exportedAt: string;
  fileBytes: number;
  imageBytes: number;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let text = '';
  for (let index = 0; index < bytes.length; index += 8192)
    text += String.fromCharCode(...bytes.subarray(index, index + 8192));
  return btoa(text);
}

function decodeBase64(value: string, expectedBytes: number) {
  if (
    value.length !== 4 * Math.ceil(expectedBytes / 3) ||
    /[^A-Za-z0-9+/=]/.test(value)
  )
    throw new ValidationError(
      'Некорректное кодирование скриншота в резервной копии.',
    );
  let decoded: string;
  try {
    decoded = atob(value);
  } catch {
    throw new ValidationError('Некорректное кодирование скриншота.');
  }
  if (decoded.length !== expectedBytes)
    throw new ValidationError('Размер скриншота не совпадает с данными файла.');
  const bytes = Uint8Array.from(decoded, (character) =>
    character.charCodeAt(0),
  );
  if (bytesToBase64(bytes) !== value)
    throw new ValidationError('Некорректное кодирование скриншота.');
  return bytes;
}

function unique<T extends { id: string }>(items: T[], label: string) {
  const map = new Map<string, T>();
  for (const item of items) {
    if (map.has(item.id))
      throw new ValidationError(`Повторяется идентификатор: ${label}.`);
    map.set(item.id, item);
  }
  return map;
}

export async function prepareBackup(
  contents: string,
  fileBytes = new Blob([contents]).size,
): Promise<PreparedBackup> {
  if (
    fileBytes > backupLimits.fileBytes ||
    contents.length > backupLimits.fileBytes
  )
    throw new ValidationError('Файл резервной копии больше 256 МиБ.');
  let raw: unknown;
  try {
    raw = JSON.parse(contents);
  } catch {
    throw new ValidationError(
      'Файл не является корректным JSON. Данные не изменены.',
    );
  }
  if (!raw || typeof raw !== 'object' || !('schemaVersion' in raw))
    throw new ValidationError('В файле отсутствует версия резервной копии.');
  if (raw.schemaVersion !== 1)
    throw new ValidationError(
      'Эта версия резервной копии не поддерживается. Данные не изменены.',
    );
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    throw new ValidationError(
      `Неверная структура резервной копии: ${parsed.error.issues[0]?.path.join('.') || 'корень файла'}.`,
    );
  const backup = parsed.data;
  const subjects = unique(backup.subjects, 'предметы');
  if (
    new Set(backup.subjects.map((subject) => subject.code)).size !== 3 ||
    new Set(backup.subjects.map((subject) => subject.sortOrder)).size !== 3
  )
    throw new ValidationError(
      'Резервная копия должна содержать все три разных предмета.',
    );
  const exercises = unique(backup.exercises, 'номера');
  const topics = unique(backup.subtopics, 'подтемы');
  const attempts = unique(backup.attempts, 'решения');
  unique(backup.attachments, 'скриншоты');
  const numbers = new Set<string>();
  for (const exercise of backup.exercises) {
    if (!subjects.has(exercise.subjectId))
      throw new ValidationError('У номера отсутствует предмет.');
    const key = `${exercise.subjectId}:${exercise.number}`;
    if (numbers.has(key))
      throw new ValidationError('Один номер повторяется внутри предмета.');
    numbers.add(key);
  }
  for (const topic of backup.subtopics)
    if (!exercises.has(topic.exerciseId))
      throw new ValidationError('У подтемы отсутствует номер.');
  for (const attempt of backup.attempts) {
    if (!exercises.has(attempt.exerciseId))
      throw new ValidationError('У решения отсутствует номер.');
    if (
      attempt.subtopicId !== null &&
      topics.get(attempt.subtopicId)?.exerciseId !== attempt.exerciseId
    )
      throw new ValidationError(
        'Подтема решения отсутствует или принадлежит другому номеру.',
      );
  }
  const imageAttempts = new Set<string>();
  let imageBytes = 0;
  // Validate all references and aggregate sizes before decoding the first image.
  for (const image of backup.attachments) {
    if (!attempts.has(image.attemptId))
      throw new ValidationError('У скриншота отсутствует решение.');
    if (imageAttempts.has(image.attemptId))
      throw new ValidationError(
        'В этой версии допускается один скриншот на решение.',
      );
    imageAttempts.add(image.attemptId);
    imageBytes += image.size;
    if (imageBytes > backupLimits.decodedImageBytes)
      throw new ValidationError('Общий размер скриншотов превышает 128 МиБ.');
  }
  const attachments: Attachment[] = [];
  for (const image of backup.attachments) {
    const { base64, ...metadata } = image;
    const blob = new Blob([decodeBase64(base64, image.size)], {
      type: image.mimeType,
    });
    await validateImage({ ...metadata, blob });
    attachments.push({
      ...metadata,
      blob,
      createdAt: isoDate(metadata.createdAt),
    });
  }
  return {
    exportedAt: isoDate(backup.exportedAt),
    fileBytes,
    imageBytes,
    data: {
      subjects: backup.subjects,
      exercises: backup.exercises.map((item) => ({
        ...item,
        createdAt: isoDate(item.createdAt),
        updatedAt: isoDate(item.updatedAt),
      })),
      subtopics: backup.subtopics.map((item) => ({
        ...item,
        createdAt: isoDate(item.createdAt),
        updatedAt: isoDate(item.updatedAt),
      })),
      attempts: backup.attempts.map((item) => ({
        ...item,
        solvedAt: isoDate(item.solvedAt),
        createdAt: isoDate(item.createdAt),
        updatedAt: isoDate(item.updatedAt),
      })),
      attachments,
    },
  };
}

export async function serializeBackup(
  data: DataSnapshot,
  exportedAt = new Date().toISOString(),
) {
  const sorted = <T extends { id: string }>(items: T[]) =>
    [...items].sort((a, b) => a.id.localeCompare(b.id));
  const imageBytes = data.attachments.reduce(
    (sum, image) => sum + image.size,
    0,
  );
  if (imageBytes > backupLimits.decodedImageBytes)
    throw new ValidationError(
      'Размер изображений превышает лимит переносимой копии 128 МиБ. Данные не удалены.',
    );
  const attachments: BackupFile['attachments'] = [];
  for (const image of sorted(data.attachments)) {
    const { blob, ...metadata } = image;
    attachments.push(
      imageSchema.parse({
        ...metadata,
        base64: bytesToBase64(new Uint8Array(await blob.arrayBuffer())),
      }),
    );
  }
  const backup: BackupFile = {
    schemaVersion: 1,
    exportedAt: isoDate(exportedAt),
    subjects: sorted(data.subjects),
    exercises: sorted(data.exercises),
    subtopics: sorted(data.subtopics),
    attempts: sorted(data.attempts),
    attachments,
  };
  // Schema order makes serialization stable before and after an import.
  const contents = JSON.stringify(schema.parse(backup), null, 2);
  if (new Blob([contents]).size > backupLimits.fileBytes)
    throw new ValidationError(
      'Резервная копия превышает лимит 256 МиБ. Данные не удалены.',
    );
  return contents;
}

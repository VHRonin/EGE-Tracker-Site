import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ImagePlus, X } from 'lucide-react';
import type {
  Attachment,
  Attempt,
  ImageChange,
  Subtopic,
} from '../../domain/entities';
import { errorMessage, limits } from '../../domain/validation';
import { suggestAnswer } from '../../domain/answers';
import { prepareScreenshot, tracker } from '../../application/tracker';
import { useMutation } from '../../application/useMutation';
import { fromLocalInput, toLocalInput } from '../../shared/dates';
import { Dialog } from '../../shared/ui/Dialog';
import { Button } from '../../shared/ui/Button';
import {
  RadioGroup,
  SelectField,
  TextAreaField,
  TextField,
} from '../../shared/ui/FormControls';
import { BlobImage } from '../../shared/ui/BlobImage';

export type AttemptWithImage = Attempt & { attachment: Attachment | null };

export function AttemptForm({
  exerciseId,
  topics,
  attempt,
  defaultSubtopic = null,
  onClose,
  onSaved,
}: {
  exerciseId: string;
  topics: Subtopic[];
  attempt?: AttemptWithImage;
  defaultSubtopic?: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [result, setResult] = useState(
    attempt ? (attempt.isCorrect ? 'correct' : 'incorrect') : '',
  );
  const [expanded, setExpanded] = useState(Boolean(attempt));
  const [subtopicId, setSubtopicId] = useState(
    attempt?.subtopicId ?? defaultSubtopic ?? '',
  );
  const [initialDate] = useState(attempt?.solvedAt ?? new Date().toISOString());
  const [date, setDate] = useState(toLocalInput(initialDate));
  const [description, setDescription] = useState(attempt?.description ?? '');
  const [myAnswer, setMyAnswer] = useState(attempt?.myAnswer ?? '');
  const [correctAnswer, setCorrectAnswer] = useState(
    attempt?.correctAnswer ?? '',
  );
  const [comment, setComment] = useState(attempt?.comment ?? '');
  const [image, setImage] = useState<ImageChange>(undefined);
  const [imageError, setImageError] = useState('');
  const [processing, setProcessing] = useState(false);
  const selection = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const mutation = useMutation();
  const suggestion = suggestAnswer(myAnswer, correctAnswer);
  const currentImage = image === undefined ? attempt?.attachment : image;
  const locked = mutation.busy || processing;
  useEffect(
    () => () => {
      selection.current += 1;
    },
    [],
  );

  async function chooseImage(file: File | undefined) {
    if (!file) return;
    const request = ++selection.current;
    setProcessing(true);
    setImageError('');
    try {
      const prepared = await prepareScreenshot(file);
      if (selection.current === request) setImage(prepared);
    } catch (error) {
      if (selection.current === request) setImageError(errorMessage(error));
    } finally {
      if (selection.current === request) setProcessing(false);
    }
  }

  return (
    <Dialog
      open
      title={attempt ? 'Изменить решение' : 'Добавить решение'}
      description="Выбери результат. Все подробности необязательны."
      onClose={onClose}
      busy={locked}
    >
      <form
        className="form-stack"
        onSubmit={(event) => {
          event.preventDefault();
          if (!result || processing || imageError) return;
          void mutation.run(
            () =>
              tracker.saveAttempt(
                {
                  exerciseId,
                  isCorrect: result === 'correct',
                  subtopicId: subtopicId || null,
                  solvedAt:
                    date === toLocalInput(initialDate)
                      ? initialDate
                      : date
                        ? fromLocalInput(date)
                        : new Date().toISOString(),
                  description,
                  myAnswer,
                  correctAnswer,
                  comment,
                },
                image,
                attempt?.id,
              ),
            () => {
              onSaved();
              onClose();
            },
          );
        }}
      >
        <RadioGroup
          legend="Результат"
          name="attempt-result"
          value={result}
          onChange={setResult}
          options={[
            { value: 'correct', label: 'Правильно' },
            { value: 'incorrect', label: 'Неправильно' },
          ]}
        />
        {!result && (
          <p className="help-text">
            Выбери результат, чтобы сохранить решение.
          </p>
        )}
        <Button
          variant="ghost"
          className="details-toggle"
          aria-expanded={expanded}
          aria-controls="attempt-details"
          onClick={() => setExpanded(!expanded)}
        >
          <ChevronDown size={17} aria-hidden="true" />
          {expanded ? 'Скрыть подробности' : 'Добавить подробности'}
        </Button>
        <div id="attempt-details" hidden={!expanded}>
          <div className="form-stack">
            <SelectField
              label="Подтема"
              value={subtopicId}
              onChange={(event) => setSubtopicId(event.target.value)}
            >
              <option value="">Без подтемы</option>
              {subtopicId && !topics.some((t) => t.id === subtopicId) && (
                <option value={subtopicId} disabled>
                  Подтема удалена — выберите другую
                </option>
              )}
              {topics.map((topic) => (
                <option value={topic.id} key={topic.id}>
                  {topic.title}
                </option>
              ))}
            </SelectField>
            <TextField
              label="Дата и время решения"
              type="datetime-local"
              step="1"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              hint="Местное время. Можно внести старое решение; пустое поле означает текущее время."
            />
            <TextAreaField
              label="Условие или описание"
              maxLength={limits.description}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <div className="form-columns">
              <TextField
                label="Мой ответ"
                maxLength={limits.answer}
                value={myAnswer}
                onChange={(event) => setMyAnswer(event.target.value)}
              />
              <TextField
                label="Правильный ответ"
                maxLength={limits.answer}
                value={correctAnswer}
                onChange={(event) => setCorrectAnswer(event.target.value)}
              />
            </div>
            {suggestion !== null ? (
              <div className="answer-suggestion">
                <p>
                  {suggestion
                    ? 'Тексты ответов совпадают.'
                    : 'Тексты ответов различаются.'}{' '}
                  Сравниваются только символы, без проверки решения.
                </p>
                <Button
                  variant="secondary"
                  onClick={() =>
                    setResult(suggestion ? 'correct' : 'incorrect')
                  }
                >
                  Использовать: {suggestion ? 'правильно' : 'неправильно'}
                </Button>
              </div>
            ) : myAnswer.trim() && correctAnswer.trim() ? (
              <p className="help-text">
                Этот формат нельзя надёжно сравнить. Выбери результат вручную.
              </p>
            ) : null}
            <TextAreaField
              label="Комментарий"
              maxLength={limits.comment}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
            <div className="field">
              <label htmlFor="attempt-image" className="image-label">
                <ImagePlus size={17} aria-hidden="true" />
                Скриншот задания
              </label>
              <input
                ref={fileRef}
                id="attempt-image"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={locked}
                aria-describedby="image-hint"
                onChange={(event) => void chooseImage(event.target.files?.[0])}
              />
              <p className="field__hint" id="image-hint">
                Один файл PNG, JPEG или WebP, до 10 МБ. Изображение сохраняется
                в браузере.
              </p>
            </div>
            {processing && (
              <p role="status" className="help-text">
                Проверяем изображение…
              </p>
            )}
            {imageError && (
              <div>
                <p role="alert" className="field__error">
                  {imageError}
                </p>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setImageError('');
                    if (fileRef.current) fileRef.current.value = '';
                  }}
                >
                  Отменить выбор файла
                </Button>
              </div>
            )}
            {currentImage && (
              <div className="image-preview">
                <BlobImage
                  blob={currentImage.blob}
                  alt="Предпросмотр скриншота задания"
                />
                <p className="help-text break-anywhere">
                  {currentImage.filename}
                </p>
                <Button
                  variant="ghost"
                  disabled={locked}
                  onClick={() => {
                    setImage(null);
                    setImageError('');
                    if (fileRef.current) fileRef.current.value = '';
                  }}
                >
                  <X size={16} aria-hidden="true" />
                  Убрать скриншот
                </Button>
              </div>
            )}
          </div>
        </div>
        {mutation.error && (
          <p className="feedback feedback--error" role="alert">
            {mutation.error}
          </p>
        )}
        <div className="dialog__actions">
          <Button variant="secondary" disabled={locked} onClick={onClose}>
            Отмена
          </Button>
          <Button
            type="submit"
            disabled={!result || locked || Boolean(imageError)}
          >
            {mutation.busy ? 'Сохраняем…' : 'Сохранить решение'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

import { useState } from 'react';
import type { Exercise } from '../../domain/entities';
import { tracker } from '../../application/tracker';
import { useMutation } from '../../application/useMutation';
import { Dialog } from '../../shared/ui/Dialog';
import { Button } from '../../shared/ui/Button';
import { TextField } from '../../shared/ui/FormControls';
import { limits } from '../../domain/validation';

export function ExerciseEditor({
  subjectId,
  exercise,
  onClose,
  onSaved,
}: {
  subjectId: string;
  exercise?: Exercise;
  onClose: () => void;
  onSaved?: (exercise: Exercise) => void;
}) {
  const [number, setNumber] = useState(exercise ? String(exercise.number) : '');
  const [title, setTitle] = useState(exercise?.title ?? '');
  const mutation = useMutation();
  return (
    <Dialog
      open
      title={exercise ? 'Изменить номер' : 'Добавить номер'}
      onClose={onClose}
      busy={mutation.busy}
    >
      <form
        className="form-stack"
        onSubmit={(event) => {
          event.preventDefault();
          void mutation.run(
            () =>
              tracker.saveExercise(
                subjectId,
                Number(number),
                title.trim() || `Задание №${number}`,
                exercise?.id,
              ),
            (saved) => {
              onSaved?.(saved);
              onClose();
            },
          );
        }}
      >
        <TextField
          label="Номер задания"
          type="number"
          min={1}
          max={999}
          step={1}
          required
          value={number}
          onChange={(event) => setNumber(event.target.value)}
        />
        <TextField
          label="Название"
          maxLength={limits.title}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          hint="Если оставить пустым, используем «Задание №N»."
        />
        {mutation.error && (
          <p role="alert" className="field__error">
            {mutation.error}
          </p>
        )}
        <div className="dialog__actions">
          <Button
            variant="secondary"
            disabled={mutation.busy}
            onClick={onClose}
          >
            Отмена
          </Button>
          <Button type="submit" disabled={mutation.busy}>
            {mutation.busy ? 'Сохраняем…' : 'Сохранить номер'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

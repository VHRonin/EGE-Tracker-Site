import { useState } from 'react';
import type { Subtopic } from '../../domain/entities';
import { tracker } from '../../application/tracker';
import { useMutation } from '../../application/useMutation';
import { fromLocalInput, toLocalInput } from '../../shared/dates';
import { Button } from '../../shared/ui/Button';
import { Dialog } from '../../shared/ui/Dialog';
import { SelectField, TextField } from '../../shared/ui/FormControls';

export function BatchForm({
  exerciseId,
  topics,
  onClose,
  onSaved,
}: {
  exerciseId: string;
  topics: Subtopic[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [correct, setCorrect] = useState('0');
  const [incorrect, setIncorrect] = useState('0');
  const [subtopicId, setSubtopicId] = useState('');
  const [date, setDate] = useState(toLocalInput(new Date().toISOString()));
  const mutation = useMutation();
  const total = Number(correct) + Number(incorrect);
  return (
    <Dialog
      open
      title="Добавить пачку решений"
      description="Каждый результат станет отдельной записью с общим временем. До 100 решений за один раз."
      onClose={onClose}
      busy={mutation.busy}
    >
      <form
        className="form-stack"
        onSubmit={(event) => {
          event.preventDefault();
          void mutation.run(
            () =>
              tracker.addBatch(
                exerciseId,
                Number(correct),
                Number(incorrect),
                subtopicId || null,
                date ? fromLocalInput(date) : new Date().toISOString(),
              ),
            () => {
              onSaved();
              onClose();
            },
          );
        }}
      >
        <div className="form-columns">
          <TextField
            label="Правильных"
            type="number"
            min={0}
            max={100}
            step={1}
            value={correct}
            onChange={(event) => setCorrect(event.target.value)}
          />
          <TextField
            label="Неправильных"
            type="number"
            min={0}
            max={100}
            step={1}
            value={incorrect}
            onChange={(event) => setIncorrect(event.target.value)}
          />
        </div>
        <p className="help-text" role="status">
          Всего решений: {Number.isFinite(total) ? total : '—'}
        </p>
        <SelectField
          label="Подтема"
          value={subtopicId}
          onChange={(event) => setSubtopicId(event.target.value)}
        >
          <option value="">Без подтемы</option>
          {topics.map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.title}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Дата и время решений"
          type="datetime-local"
          step="1"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          hint="Местное время; пустое поле означает текущее время."
        />
        {mutation.error && (
          <p className="feedback feedback--error" role="alert">
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
            {mutation.busy ? 'Сохраняем…' : 'Сохранить пачку'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

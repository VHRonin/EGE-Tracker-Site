import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { Subtopic } from '../../domain/entities';
import { tracker } from '../../application/tracker';
import { useMutation } from '../../application/useMutation';
import { Button } from '../../shared/ui/Button';
import { Dialog } from '../../shared/ui/Dialog';
import { TextField } from '../../shared/ui/FormControls';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { limits } from '../../domain/validation';
import type { PracticeMetrics } from '../../domain/scoring';
import { ProgressMetrics } from '../../shared/ui/ProgressMetrics';

function SubtopicEditor({
  exerciseId,
  topic,
  onClose,
}: {
  exerciseId: string;
  topic?: Subtopic;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(topic?.title ?? '');
  const mutation = useMutation();
  return (
    <Dialog
      open
      title={topic ? 'Переименовать подтему' : 'Добавить подтему'}
      onClose={onClose}
      busy={mutation.busy}
    >
      <form
        className="form-stack"
        onSubmit={(event) => {
          event.preventDefault();
          void mutation.run(
            () => tracker.saveSubtopic(exerciseId, title, topic?.id),
            onClose,
          );
        }}
      >
        <TextField
          label="Название подтемы"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={limits.title}
          required
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
            {mutation.busy ? 'Сохраняем…' : 'Сохранить подтему'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function SubtopicManager({
  exerciseId,
  topics,
  counts,
  metrics,
}: {
  exerciseId: string;
  topics: Subtopic[];
  counts: Record<string, number>;
  metrics?: Array<Subtopic & { metrics: PracticeMetrics }>;
}) {
  const [editing, setEditing] = useState<Subtopic | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Subtopic | null>(null);
  return (
    <section aria-labelledby="subtopics-title" className="card topics-card">
      <div className="section-heading">
        <h2 id="subtopics-title">Подтемы</h2>
        <Button variant="ghost" onClick={() => setEditing('new')}>
          <Plus size={16} aria-hidden="true" />
          Добавить подтему
        </Button>
      </div>
      <p className="help-text">
        Подтема необязательна. Можно записывать решения сразу в номер.
      </p>
      {topics.length > 0 ? (
        <ul className="topic-list">
          {topics.map((topic) => (
            <li key={topic.id}>
              <div>
                <span>{topic.title}</span>
                <small>Решений: {counts[topic.id] ?? 0}</small>
                {metrics?.find((item) => item.id === topic.id) && (
                  <details className="topic-recommendations">
                    <summary>Показатели подтемы</summary>
                    <ProgressMetrics
                      compact
                      metrics={
                        metrics.find((item) => item.id === topic.id)!.metrics
                      }
                    />
                  </details>
                )}
              </div>
              <div className="row-actions">
                <Button
                  variant="ghost"
                  className="icon-button"
                  aria-label={`Переименовать подтему «${topic.title}»`}
                  onClick={() => setEditing(topic)}
                >
                  <Pencil size={16} aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  className="icon-button"
                  aria-label={`Удалить подтему «${topic.title}»`}
                  onClick={() => setDeleting(topic)}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="subtle-empty">Подтем пока нет.</p>
      )}
      {editing && (
        <SubtopicEditor
          exerciseId={exerciseId}
          topic={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Удалить подтему?"
          description={`«${deleting.title}» будет удалена. Все её решения и скриншоты останутся в этом номере без подтемы.`}
          confirmLabel="Удалить подтему"
          onConfirm={() => tracker.deleteSubtopic(deleting.id)}
          onClose={() => setDeleting(null)}
        />
      )}
    </section>
  );
}

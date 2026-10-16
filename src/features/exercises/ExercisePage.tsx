import { useState } from 'react';
import {
  ArrowLeft,
  History,
  Image,
  Layers,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useExercise, useProgress } from '../../application/queries';
import { tracker } from '../../application/tracker';
import { PageHeading } from '../../shared/ui/PageHeading';
import { Button, ButtonLink } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import { EmptyState } from '../../shared/ui/EmptyState';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { QueryFeedback } from '../../shared/ui/QueryFeedback';
import { NotFoundPage } from '../../shared/ui/NotFoundPage';
import { SelectField } from '../../shared/ui/FormControls';
import { formatDate } from '../../shared/dates';
import { ExerciseEditor } from './ExerciseEditor';
import { SubtopicManager } from './SubtopicManager';
import { AttemptForm } from '../attempts/AttemptForm';
import { AttemptDetails } from '../attempts/AttemptDetails';
import { BatchForm } from '../attempts/BatchForm';
import { ProgressMetrics } from '../../shared/ui/ProgressMetrics';

type ActiveDialog =
  | { kind: 'new' | 'batch' | 'exercise-edit' | 'exercise-delete' }
  | { kind: 'view' | 'edit' | 'delete'; id: string }
  | null;

export function ExerciseRoute() {
  const { subjectCode = '', exerciseId = '' } = useParams();
  return (
    <ExercisePage
      key={`${subjectCode}:${exerciseId}`}
      subjectCode={subjectCode}
      exerciseId={exerciseId}
    />
  );
}

function ExercisePage({
  subjectCode,
  exerciseId,
}: {
  subjectCode: string;
  exerciseId: string;
}) {
  const query = useExercise(exerciseId, subjectCode);
  const progressQuery = useProgress();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<ActiveDialog>(null);
  const [filter, setFilter] = useState('all');
  const [notice, setNotice] = useState('');
  const close = () => setDialog(null);
  if (query.status !== 'ready')
    return (
      <QueryFeedback
        error={query.status === 'error' ? query.message : undefined}
      />
    );
  if (!query.data) return <NotFoundPage />;
  const { subject, exercise, subtopics, attempts } = query.data;
  const progress =
    progressQuery.status === 'ready'
      ? progressQuery.data.progress.find((item) => item.id === exerciseId)
      : undefined;
  const activeFilter =
    filter === 'all' ||
    filter === 'none' ||
    subtopics.some((topic) => topic.id === filter)
      ? filter
      : 'all';
  const visible = attempts.filter(
    (attempt) =>
      activeFilter === 'all' ||
      (activeFilter === 'none'
        ? attempt.subtopicId === null
        : attempt.subtopicId === activeFilter),
  );
  const counts = Object.fromEntries(
    subtopics.map((topic) => [
      topic.id,
      attempts.filter((attempt) => attempt.subtopicId === topic.id).length,
    ]),
  );
  const selected =
    dialog && 'id' in dialog
      ? attempts.find((attempt) => attempt.id === dialog.id)
      : undefined;
  const topicTitle = (id: string | null) =>
    subtopics.find((topic) => topic.id === id)?.title ?? 'Без подтемы';
  const saved = () => setNotice('Решения сохранены в этом браузере.');

  return (
    <>
      <ButtonLink
        to={`/subjects/${subjectCode}`}
        variant="ghost"
        className="back-link"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {subject.title}
      </ButtonLink>
      <PageHeading
        eyebrow={`НОМЕР ${exercise.number} · ${subject.title.toLocaleUpperCase('ru')}`}
        title={exercise.title}
        visual={<span className="exam-number">№{exercise.number}</span>}
        description="Записывай результаты и сохраняй подробности, к которым захочется вернуться."
        action={
          <Button onClick={() => setDialog({ kind: 'new' })}>
            <Plus size={17} aria-hidden="true" />
            Добавить решение
          </Button>
        }
      />
      <div className="exercise-toolbar">
        <span className="record-count">
          Всего решений: <strong>{attempts.length}</strong>
        </span>
        <div className="row-actions">
          <Button
            variant="secondary"
            onClick={() => setDialog({ kind: 'batch' })}
          >
            <Layers size={16} aria-hidden="true" />
            Добавить пачку
          </Button>
          <Button
            variant="ghost"
            aria-label="Изменить номер"
            onClick={() => setDialog({ kind: 'exercise-edit' })}
          >
            <Pencil size={16} aria-hidden="true" />
            Изменить номер
          </Button>
          <Button
            variant="ghost"
            aria-label="Удалить номер"
            onClick={() => setDialog({ kind: 'exercise-delete' })}
          >
            <Trash2 size={16} aria-hidden="true" />
            Удалить
          </Button>
        </div>
      </div>
      {notice && (
        <p className="feedback feedback--success" role="status">
          {notice}
        </p>
      )}
      {progress && <ProgressMetrics metrics={progress.metrics} />}
      <p className="catalog-note">
        Освоение — эвристика по истории, не прогноз балла ЕГЭ. Объём для
        уверенности достигает 100 % после 15 решений; давность влияет на
        отдельную метку повторения.
      </p>
      <SubtopicManager
        exerciseId={exerciseId}
        topics={subtopics}
        counts={counts}
        metrics={progress?.topics}
      />
      <section className="card history-card" aria-labelledby="history-title">
        <div className="history-heading">
          <div>
            <h2 id="history-title">История решений</h2>
            <p className="help-text">
              Сначала новые записи. Показано: {visible.length}.
            </p>
          </div>
          <SelectField
            label="Показать решения"
            value={activeFilter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="all">Все подтемы</option>
            <option value="none">Без подтемы</option>
            {subtopics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.title}
              </option>
            ))}
          </SelectField>
        </div>
        {visible.length ? (
          <ol className="attempt-list">
            {visible.map((attempt) => (
              <li key={attempt.id} className="attempt-row">
                <button
                  className="attempt-summary"
                  onClick={() => setDialog({ kind: 'view', id: attempt.id })}
                >
                  <span className="attempt-summary__top">
                    <Badge tone={attempt.isCorrect ? 'success' : 'danger'}>
                      {attempt.isCorrect ? 'Правильно' : 'Неправильно'}
                    </Badge>
                    <time dateTime={attempt.solvedAt}>
                      {formatDate(attempt.solvedAt)}
                    </time>
                    {attempt.attachment && (
                      <span className="attachment-indicator">
                        <Image size={15} aria-hidden="true" />
                        <span className="sr-only">Есть скриншот</span>
                      </span>
                    )}
                  </span>
                  <span className="attempt-topic">
                    {topicTitle(attempt.subtopicId)}
                  </span>
                  {(attempt.description || attempt.comment) && (
                    <span className="attempt-snippet">
                      {attempt.description || attempt.comment}
                    </span>
                  )}
                  <span className="attempt-open">Подробнее</span>
                </button>
                <div className="row-actions">
                  <Button
                    variant="ghost"
                    className="icon-button"
                    aria-label={`Изменить решение от ${formatDate(attempt.solvedAt)}`}
                    onClick={() => setDialog({ kind: 'edit', id: attempt.id })}
                  >
                    <Pencil size={16} aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    className="icon-button"
                    aria-label={`Удалить решение от ${formatDate(attempt.solvedAt)}`}
                    onClick={() =>
                      setDialog({ kind: 'delete', id: attempt.id })
                    }
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState
            icon={History}
            title={
              attempts.length
                ? 'В этом разделе пока нет решений'
                : 'Запиши первое решение'
            }
            description="Достаточно выбрать «Правильно» или «Неправильно». Подробности можно добавить позже."
            action={
              <Button
                variant="secondary"
                onClick={() => setDialog({ kind: 'new' })}
              >
                Добавить решение
              </Button>
            }
          />
        )}
      </section>
      {dialog?.kind === 'new' && (
        <AttemptForm
          exerciseId={exerciseId}
          topics={subtopics}
          defaultSubtopic={
            activeFilter === 'all' || activeFilter === 'none'
              ? null
              : activeFilter
          }
          onClose={close}
          onSaved={saved}
        />
      )}
      {dialog?.kind === 'edit' && selected && (
        <AttemptForm
          exerciseId={exerciseId}
          topics={subtopics}
          attempt={selected}
          onClose={close}
          onSaved={saved}
        />
      )}
      {dialog?.kind === 'view' && selected && (
        <AttemptDetails
          attempt={selected}
          topic={topicTitle(selected.subtopicId)}
          onClose={close}
          onEdit={() => setDialog({ kind: 'edit', id: selected.id })}
        />
      )}
      {dialog?.kind === 'batch' && (
        <BatchForm
          exerciseId={exerciseId}
          topics={subtopics}
          onClose={close}
          onSaved={saved}
        />
      )}
      {dialog?.kind === 'exercise-edit' && (
        <ExerciseEditor
          subjectId={subject.id}
          exercise={exercise}
          onClose={close}
        />
      )}
      {dialog?.kind === 'exercise-delete' && (
        <ConfirmDialog
          title="Удалить номер и его историю?"
          description={`«${exercise.title}», все подтемы, решения (${attempts.length}) и их скриншоты будут удалены без возможности восстановления.`}
          confirmLabel="Удалить номер и историю"
          onClose={close}
          onConfirm={async () => {
            await tracker.deleteExercise(exerciseId);
            navigate(`/subjects/${subjectCode}`);
          }}
        />
      )}
      {dialog?.kind === 'delete' && selected && (
        <ConfirmDialog
          title="Удалить решение?"
          description="Запись и её скриншот будут удалены без возможности восстановления."
          confirmLabel="Удалить решение"
          onClose={close}
          onConfirm={async () => {
            await tracker.deleteAttempt(selected.id);
            setNotice('Решение удалено.');
          }}
        />
      )}
    </>
  );
}

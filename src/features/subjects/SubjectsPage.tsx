import { publicAsset } from '../../shared/assets';
import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BookOpenCheck,
  Plus,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { SubjectCards } from './SubjectCards';
import { useSubjectAnalysis } from '../../application/queries';
import { PageHeading } from '../../shared/ui/PageHeading';
import { Card } from '../../shared/ui/Card';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Badge } from '../../shared/ui/Badge';
import { ProgressBadges } from '../../shared/ui/ProgressMetrics';
import { percentage } from '../../shared/format';
import { formatDate } from '../../shared/dates';
import { SelectField, TextField } from '../../shared/ui/FormControls';
import { Button, ButtonLink } from '../../shared/ui/Button';
import { NotFoundPage } from '../../shared/ui/NotFoundPage';
import { QueryFeedback } from '../../shared/ui/QueryFeedback';
import { ExerciseEditor } from '../exercises/ExerciseEditor';

export function SubjectsPage() {
  return (
    <>
      <PageHeading
        eyebrow="ПОДГОТОВКА ПО НАПРАВЛЕНИЯМ"
        title="Твои предметы"
        visual={
          <span className="poster-heading-stamp">
            <BookOpenCheck size={88} strokeWidth={1.2} />
          </span>
        }
        description="Выбери предмет, с которым хочешь поработать сегодня."
      />
      <section aria-label="Предметы подготовки">
        <SubjectCards />
      </section>
      <p className="section-footnote">
        Номера заданий, необязательные подтемы и полная история решений — в
        каждом предмете.
      </p>
    </>
  );
}

export function SubjectPage() {
  const { subjectCode = '' } = useParams();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('number');
  const query = useSubjectAnalysis(subjectCode, search, filter, sort);
  const [adding, setAdding] = useState(false);
  if (query.status !== 'ready')
    return (
      <QueryFeedback
        error={query.status === 'error' ? query.message : undefined}
      />
    );
  if (!query.data) return <NotFoundPage />;
  const { subject, exercises, totalExercises } = query.data;
  return (
    <>
      <ButtonLink to="/subjects" variant="ghost" className="back-link">
        <ArrowLeft size={16} aria-hidden="true" />
        Все предметы
      </ButtonLink>
      <PageHeading
        eyebrow={
          subject.code === 'math' ? 'ПРОФИЛЬНЫЙ УРОВЕНЬ' : 'ПОДГОТОВКА К ЕГЭ'
        }
        title={subject.title}
        visual={
          <img
            src={publicAsset(`illustrations/${subject.code}.svg`)}
            alt=""
            width={260}
            height={230}
          />
        }
        description="Выбери номер, чтобы записать решение или вернуться к истории."
        action={
          <Button variant="secondary" onClick={() => setAdding(true)}>
            <Plus size={17} aria-hidden="true" />
            Добавить номер
          </Button>
        }
      />
      <p className="catalog-note">
        Стартовый набор по твоему списку. Меняй названия и состав номеров под
        свою подготовку.
      </p>
      <div className="catalog-filters">
        <TextField
          label="Поиск по номеру или названию"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Например, 7 или название"
        />
        <SelectField
          label="Фильтр номеров"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="all">Все</option>
          <option value="unseen">Не изучено</option>
          <option value="practice">Нужна практика</option>
          <option value="due">Пора повторить</option>
        </SelectField>
        <SelectField
          label="Сортировка"
          value={sort}
          onChange={(event) => setSort(event.target.value)}
        >
          <option value="number">По номеру</option>
          <option value="priority">По приоритету</option>
        </SelectField>
      </div>
      <p className="help-text results-count" role="status">
        Показано номеров: {exercises.length} из {totalExercises}.
      </p>
      {exercises.length ? (
        <ul className="exercise-list">
          {exercises.map((exercise) => (
            <li key={exercise.id}>
              <Link
                to={`/subjects/${subjectCode}/exercises/${exercise.id}`}
                className="exercise-link"
              >
                <span className="exercise-number">
                  <span aria-hidden="true">№</span>
                  {exercise.number}
                </span>
                <span className="exercise-link__body">
                  <strong>{exercise.title}</strong>
                  <span>
                    Решений: {exercise.metrics.total} · Взвешенная точность:{' '}
                    {percentage(exercise.metrics.weightedAccuracy)}
                  </span>
                  <ProgressBadges metrics={exercise.metrics} />
                  {!exercise.metrics.reviewDue &&
                    exercise.topics.some(
                      (topic) => topic.metrics.reviewDue,
                    ) && <Badge tone="warning">Пора повторить подтему</Badge>}
                  <span>
                    Последняя практика:{' '}
                    {exercise.metrics.lastSolvedAt
                      ? formatDate(exercise.metrics.lastSolvedAt)
                      : 'ещё не было'}
                  </span>
                </span>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Card>
          <EmptyState
            icon={BookOpen}
            title={totalExercises ? 'Ничего не найдено' : 'Добавь первый номер'}
            description={
              totalExercises
                ? 'Попробуй изменить поиск или фильтр.'
                : 'Задай номер и название, чтобы сохранять решения.'
            }
            action={
              totalExercises ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch('');
                    setFilter('all');
                  }}
                >
                  Сбросить фильтры
                </Button>
              ) : (
                <Button onClick={() => setAdding(true)}>Добавить номер</Button>
              )
            }
          />
        </Card>
      )}
      {adding && (
        <ExerciseEditor
          subjectId={subject.id}
          onClose={() => setAdding(false)}
        />
      )}
    </>
  );
}

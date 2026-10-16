import { RotateCcw } from 'lucide-react';
import { useProgress } from '../../application/queries';
import { reviewPriority } from '../../domain/scoring';
import { percentage } from '../../shared/format';
import { QueryFeedback } from '../../shared/ui/QueryFeedback';
import { EmptyState } from '../../shared/ui/EmptyState';
import { ReviewList } from '../review/ReviewList';

export function DashboardSummary() {
  const query = useProgress();
  if (query.status !== 'ready')
    return (
      <QueryFeedback
        error={query.status === 'error' ? query.message : undefined}
      />
    );
  const total = query.data.attempts.length;
  const correct = query.data.attempts.filter(
    (attempt) => attempt.isCorrect,
  ).length;
  const due = query.data.queue.filter(
    (item) => reviewPriority(item).due,
  ).length;
  return (
    <section
      aria-label="Сводка по всем предметам"
      className="summary-grid page-section"
    >
      <div className="card summary-tile">
        <span>Всего решений</span>
        <strong>{total}</strong>
      </div>
      <div className="card summary-tile">
        <span>Общая точность</span>
        <strong>{percentage(total ? correct / total : null)}</strong>
        <small>
          Правильных: {correct}, ошибок: {total - correct}
        </small>
      </div>
      <div className="card summary-tile">
        <span>Номеров пора повторить</span>
        <strong>{due}</strong>
        <small>Включая просроченные подтемы</small>
      </div>
    </section>
  );
}

export function DashboardReview() {
  const query = useProgress();
  if (query.status !== 'ready')
    return (
      <QueryFeedback
        error={query.status === 'error' ? query.message : undefined}
      />
    );
  return query.data.queue.length ? (
    <ReviewList compact entries={query.data.queue.slice(0, 3)} />
  ) : (
    <EmptyState
      icon={RotateCcw}
      title={
        query.data.attempts.length
          ? 'Сейчас нет рекомендаций'
          : 'Сначала — немного практики'
      }
      description="Здесь появятся номера к повторению и рекомендации по объёму и точности практики."
    />
  );
}

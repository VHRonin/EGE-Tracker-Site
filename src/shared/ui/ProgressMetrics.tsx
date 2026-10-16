import type { PracticeMetrics } from '../../domain/scoring';
import { Badge } from './Badge';
import { formatDate } from '../dates';

import { percentage } from '../format';

export function ProgressBadges({ metrics }: { metrics: PracticeMetrics }) {
  const tone =
    metrics.mastery === null
      ? 'neutral'
      : metrics.mastery < 40
        ? 'danger'
        : metrics.mastery < 60
          ? 'warning'
          : metrics.mastery < 80
            ? 'blue'
            : 'success';
  return (
    <span className="progress-badges">
      <Badge tone={tone}>{metrics.level}</Badge>
      {metrics.reviewDue && <Badge tone="warning">Пора повторить</Badge>}
    </span>
  );
}

export function ProgressMetrics({
  metrics,
  compact = false,
}: {
  metrics: PracticeMetrics;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? 'practice-metrics practice-metrics--compact'
          : 'card practice-metrics'
      }
    >
      <div className="metrics-title">
        <ProgressBadges metrics={metrics} />
        {metrics.mastery !== null && (
          <span>
            Освоение: <strong>{metrics.mastery} / 100</strong>
          </span>
        )}
      </div>
      <dl className="metrics-grid">
        <div>
          <dt>Всего решений</dt>
          <dd>{metrics.total}</dd>
        </div>
        <div>
          <dt>Правильных / ошибок</dt>
          <dd>
            {metrics.correct} / {metrics.incorrect}
          </dd>
        </div>
        <div>
          <dt>Общая точность</dt>
          <dd>{percentage(metrics.accuracy)}</dd>
        </div>
        <div>
          <dt>Взвешенная точность</dt>
          <dd>{percentage(metrics.weightedAccuracy)}</dd>
        </div>
        <div>
          <dt>Объём для уверенности</dt>
          <dd>
            {percentage(metrics.confidence)}{' '}
            <small>({metrics.total} / 15 решений)</small>
          </dd>
        </div>
        <div>
          <dt>Последняя практика</dt>
          <dd className="metric-date">
            {metrics.lastSolvedAt
              ? formatDate(metrics.lastSolvedAt)
              : 'Ещё не было'}
            {metrics.daysSinceLast !== null && (
              <small>Прошло дней: {Math.floor(metrics.daysSinceLast)}</small>
            )}
          </dd>
        </div>
      </dl>
      {metrics.reviewAt && (
        <p className="review-date">
          {metrics.reviewDue ? 'Повторение с' : 'Следующее повторение'}:{' '}
          <time dateTime={metrics.reviewAt}>
            {formatDate(metrics.reviewAt)}
          </time>
        </p>
      )}
      {metrics.reasons.length > 0 && (
        <p className="help-text">
          Рекомендации: {metrics.reasons.join(' · ')}.
        </p>
      )}
    </div>
  );
}

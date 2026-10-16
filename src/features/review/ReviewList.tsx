import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ExerciseProgress } from '../../domain/scoring';
import { ProgressBadges } from '../../shared/ui/ProgressMetrics';
import { Badge } from '../../shared/ui/Badge';

export function ReviewList({
  entries,
  compact = false,
}: {
  entries: ExerciseProgress[];
  compact?: boolean;
}) {
  return (
    <ol className="review-list">
      {entries.map((item) => (
        <li
          key={item.id}
          className={`${compact ? 'review-item' : 'card review-item'} review-item--${item.subject.code}`}
        >
          <Link
            to={`/subjects/${item.subject.code}/exercises/${item.id}`}
            className="review-item__link"
          >
            <span className="review-number" aria-hidden="true">
              №{item.number}
            </span>
            <div>
              <span className="help-text">
                {item.subject.title} · №{item.number}
              </span>
              <h3>{item.title}</h3>
            </div>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <ProgressBadges metrics={item.metrics} />
          {!item.metrics.reviewDue &&
            item.topics.some((topic) => topic.metrics.reviewDue) && (
              <Badge tone="warning">Пора повторить подтему</Badge>
            )}
          {item.metrics.reasons.length > 0 && (
            <p className="help-text">{item.metrics.reasons.join(' · ')}</p>
          )}
          {!compact &&
            item.topics.some((topic) => topic.metrics.reasons.length) && (
              <details className="topic-recommendations">
                <summary>Рекомендации по подтемам этого номера</summary>
                <ul>
                  {item.topics
                    .filter((topic) => topic.metrics.reasons.length)
                    .map((topic) => (
                      <li key={topic.id}>
                        <strong>{topic.title}</strong>
                        <ProgressBadges metrics={topic.metrics} />
                        <p>{topic.metrics.reasons.join(' · ')}</p>
                      </li>
                    ))}
                </ul>
              </details>
            )}
        </li>
      ))}
    </ol>
  );
}

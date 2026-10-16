import { History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useRecentAttempts } from '../../application/queries';
import { EmptyState } from '../../shared/ui/EmptyState';
import { QueryFeedback } from '../../shared/ui/QueryFeedback';
import { Badge } from '../../shared/ui/Badge';
import { formatDate } from '../../shared/dates';

export function RecentAttempts() {
  const query = useRecentAttempts();
  if (query.status !== 'ready')
    return (
      <QueryFeedback
        error={query.status === 'error' ? query.message : undefined}
      />
    );
  if (!query.data.length)
    return (
      <EmptyState
        icon={History}
        title="Здесь начнётся твоя история"
        description="Добавь первое решение в любом предмете. Здесь будет видна недавняя практика."
      />
    );
  return (
    <ul className="recent-list">
      {query.data.map((attempt) => (
        <li key={attempt.id}>
          <Link
            to={`/subjects/${attempt.subjectCode}/exercises/${attempt.exerciseId}`}
          >
            <div>
              <strong>{attempt.exerciseTitle}</strong>
              <span>
                {attempt.subjectTitle} · {formatDate(attempt.solvedAt)}
              </span>
            </div>
            <Badge tone={attempt.isCorrect ? 'success' : 'danger'}>
              {attempt.isCorrect ? 'Правильно' : 'Неправильно'}
            </Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}

import { publicAsset } from '../../shared/assets';
import { RotateCcw } from 'lucide-react';
import { useProgress } from '../../application/queries';
import { Card } from '../../shared/ui/Card';
import { EmptyState } from '../../shared/ui/EmptyState';
import { PageHeading } from '../../shared/ui/PageHeading';
import { ButtonLink } from '../../shared/ui/Button';
import { QueryFeedback } from '../../shared/ui/QueryFeedback';
import { ReviewList } from './ReviewList';

export function ReviewPage() {
  const query = useProgress();
  return (
    <>
      <PageHeading
        eyebrow="ВОЗВРАЩАЙСЯ К ВАЖНОМУ"
        title="Повторить"
        visual={
          <img
            src={publicAsset('illustrations/mountain.svg')}
            alt=""
            width={340}
            height={220}
          />
        }
        description="Сначала просроченные повторения, затем рекомендации по срочности и уровню подготовки."
      />
      <p className="catalog-note">
        «Пора повторить» зависит от срока. Низкая точность и небольшой объём —
        отдельные рекомендации. Подтемы сгруппированы внутри номера.
      </p>
      {query.status !== 'ready' ? (
        <QueryFeedback
          error={query.status === 'error' ? query.message : undefined}
        />
      ) : query.data.queue.length ? (
        <>
          <div className="review-overview">
            <span>Твоя карта приоритетов</span>
            <p>
              Номеров с рекомендациями:{' '}
              <strong>{query.data.queue.length}</strong>
            </p>
          </div>
          <ReviewList entries={query.data.queue} />
        </>
      ) : (
        <Card>
          <EmptyState
            icon={RotateCcw}
            title={
              query.data.attempts.length
                ? 'Сейчас нет рекомендаций'
                : 'Начни с первого решения'
            }
            description="Очередь строится по сохранённой практике. Освоение и срок повторения оцениваются отдельно."
            action={
              <ButtonLink to="/subjects" variant="secondary">
                Посмотреть предметы
              </ButtonLink>
            }
          />
        </Card>
      )}
      <p className="section-footnote">
        Оценка освоения — эвристика по истории решений, не прогноз балла ЕГЭ.
      </p>
    </>
  );
}

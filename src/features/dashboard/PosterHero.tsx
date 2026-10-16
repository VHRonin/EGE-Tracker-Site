import { publicAsset } from '../../shared/assets';
import { ArrowUpRight, CalendarDays } from 'lucide-react';
import { ButtonLink } from '../../shared/ui/Button';

export function PosterHero({
  lastSolvedAt,
  pending = false,
  unavailable = false,
}: {
  lastSolvedAt: string | null;
  pending?: boolean;
  unavailable?: boolean;
}) {
  return (
    <section className="poster-hero" aria-labelledby="home-title">
      <div className="poster-hero__art" aria-hidden="true">
        <img
          src={publicAsset('illustrations/study-evening.webp')}
          width={1672}
          height={940}
          alt=""
          fetchPriority="high"
        />
      </div>
      <div className="poster-hero__copy">
        <p className="poster-eyebrow">Твой путь к ЕГЭ / шаг за шагом</p>
        <h1 id="home-title">
          <span>Твоя</span>{' '}
          <span className="poster-hero__blue">подготовка.</span>{' '}
          <span className="poster-hero__ink">Твои правила.</span>
        </h1>
        <p className="poster-hero__motto">Практикуй. Анализируй. Развивайся.</p>
        <ButtonLink to="/subjects" className="poster-button">
          К предметам <ArrowUpRight size={19} aria-hidden="true" />
        </ButtonLink>
      </div>
      <div className="last-practice-note">
        <CalendarDays size={24} strokeWidth={1.6} aria-hidden="true" />
        <div>
          {pending ? (
            <p>Загружаем историю…</p>
          ) : unavailable ? (
            <p>Не удалось загрузить историю</p>
          ) : lastSolvedAt ? (
            <>
              <p>Последняя подготовка была</p>
              <time dateTime={lastSolvedAt}>
                {new Intl.DateTimeFormat('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }).format(new Date(lastSolvedAt))}
              </time>
            </>
          ) : (
            <p className="last-practice-note__empty">
              Ты ещё не добавил ни одного решения
            </p>
          )}
        </div>
      </div>
      <span className="hero-edition" aria-hidden="true">
        Практика
        <br />
        меняет всё <ArrowUpRight size={23} aria-hidden="true" />
      </span>
    </section>
  );
}

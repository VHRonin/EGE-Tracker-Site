import { publicAsset } from '../../shared/assets';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Flame,
  PencilLine,
  TrendingUp,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CSSProperties } from 'react';
import type { HomeView } from './useHomeView';
import { percentage } from '../../shared/format';
import { formatDate } from '../../shared/dates';
import { Badge } from '../../shared/ui/Badge';

export function PosterReview({ view }: { view: HomeView }) {
  return (
    <section
      className="poster-panel poster-review"
      aria-labelledby="review-title"
    >
      <header className="poster-panel__header">
        <h2 id="review-title">
          <Flame size={21} aria-hidden="true" />
          Нужно повторить
        </h2>
        <Link
          to="/review"
          aria-label="Перейти к повторению"
          className="poster-icon-link"
        >
          <ArrowUpRight size={20} aria-hidden="true" />
        </Link>
      </header>
      <div className="summary-tile poster-review__count">
        <span>Номеров пора повторить</span>
        <strong>{view.due}</strong>
      </div>
      {view.queue.length ? (
        <ol className="poster-review__list">
          {view.queue.map((item) => (
            <li key={item.id}>
              <Link to={`/subjects/${item.subject.code}/exercises/${item.id}`}>
                <span
                  className={`poster-rank poster-rank--${item.subject.code}`}
                  aria-hidden="true"
                >
                  №{item.number}
                </span>
                <div>
                  <h3>
                    №{item.number} — {item.title}
                  </h3>
                  <p>{item.subject.title}</p>
                  <span className="poster-review__reason">
                    {item.metrics.reasons.join(' · ')}
                    {!item.metrics.reviewDue &&
                    item.topics.some((topic) => topic.metrics.reviewDue)
                      ? ' · Пора повторить подтему'
                      : ''}
                    {item.metrics.reviewDue && item.metrics.reviewAt
                      ? ` · с ${new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short' }).format(new Date(item.metrics.reviewAt))}`
                      : ''}
                  </span>
                </div>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <div className="poster-empty">
          <span className="poster-empty__mark" aria-hidden="true">
            ✓
          </span>
          <h3>Пока нечего повторять</h3>
          <p>
            {view.total
              ? 'Все рекомендации появятся здесь, когда практика подскажет следующий шаг.'
              : 'Добавь первое решение — и здесь появятся твои приоритеты.'}
          </p>
          <Link to="/subjects">
            Начать с предмета <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      )}
      <Link to="/review" className="poster-panel__footer">
        Вся очередь повторения <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </section>
  );
}

export function PosterWeekly({ view }: { view: HomeView }) {
  const maximum = view.weekly.days.reduce(
    (max, day) => Math.max(max, day.total),
    1,
  );
  return (
    <section
      className="poster-panel poster-weekly"
      aria-labelledby="weekly-title"
    >
      <header className="poster-panel__header">
        <h2 id="weekly-title">Активность за 7 дней</h2>
        <TrendingUp size={23} aria-hidden="true" />
      </header>
      <div className="poster-chart-legend">
        <span>
          <i className="legend-correct" />
          Правильно
        </span>
        <span>
          <i className="legend-incorrect" />
          Неправильно
        </span>
      </div>
      <div
        className="poster-bars"
        role="img"
        aria-label={`Практика за 7 дней: ${view.weekly.total} решений, ${view.weekly.correct} правильных, ${view.weekly.incorrect} неправильных.`}
      >
        <div className="poster-bars__axis">
          <span>{maximum}</span>
          <span>0</span>
        </div>
        {view.weekly.days.map((day) => (
          <div className="poster-bars__day" key={day.date}>
            <div className="poster-bars__track">
              <div
                className="poster-bars__incorrect"
                style={{ height: `${(100 * day.incorrect) / maximum}%` }}
              />
              <div
                className="poster-bars__correct"
                style={{ height: `${(100 * day.correct) / maximum}%` }}
              />
            </div>
            <span>
              {new Intl.DateTimeFormat('ru', { weekday: 'short' }).format(
                new Date(`${day.date}T12:00:00`),
              )}
            </span>
          </div>
        ))}
      </div>
      <p className="poster-weekly__total">
        Решений за 7 дней: <strong>{view.weekly.total}</strong>
      </p>
      {view.weekly.total === 0 && (
        <p className="poster-panel__hint">
          Пока без записей. Каждый столбик начнётся с реального решения.
        </p>
      )}
      <details className="poster-weekly__details">
        <summary>Данные по дням</summary>
        <ul>
          {view.weekly.days.map((day) => (
            <li key={day.date}>
              <time dateTime={day.date}>
                {new Intl.DateTimeFormat('ru', {
                  day: 'numeric',
                  month: 'short',
                }).format(new Date(`${day.date}T12:00:00`))}
              </time>
              <span>
                {day.correct} правильно / {day.incorrect} неправильно
              </span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

export function PosterTotals({ view }: { view: HomeView }) {
  const ring = {
    '--accuracy-angle': `${(view.accuracy ?? 0) * 360}deg`,
  } as CSSProperties;
  return (
    <section
      className="poster-panel poster-totals"
      aria-labelledby="totals-title"
    >
      <header className="poster-panel__header">
        <h2 id="totals-title">Общая статистика</h2>
        <span className="poster-spark" aria-hidden="true">
          ✳
        </span>
      </header>
      <div className="poster-totals__body">
        <div
          className={`poster-accuracy ${view.total ? '' : 'poster-accuracy--empty'}`}
          style={ring}
        >
          <div>
            <strong>{percentage(view.accuracy)}</strong>
            <span>Общая точность</span>
          </div>
        </div>
        <dl className="poster-totals__numbers">
          <div className="summary-tile">
            <dt>Всего решений</dt>
            <dd>
              <strong>{view.total}</strong>
            </dd>
          </div>
          <div className="totals-correct">
            <dt>
              <Check size={14} aria-hidden="true" />
              Правильных
            </dt>
            <dd>{view.correct}</dd>
          </div>
          <div className="totals-incorrect">
            <dt>
              <X size={14} aria-hidden="true" />
              Неправильных
            </dt>
            <dd>{view.incorrect}</dd>
          </div>
        </dl>
      </div>
      <p className="poster-panel__hint">
        {view.total
          ? 'По всей сохранённой истории трёх предметов.'
          : 'Первое решение — точка отсчёта. Пока точность не определена.'}
      </p>
      <Link to="/statistics" className="poster-panel__footer">
        Смотреть статистику <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </section>
  );
}

export function PosterRecent({ view }: { view: HomeView }) {
  return (
    <section
      className="poster-panel poster-recent"
      aria-labelledby="recent-title"
    >
      <header className="poster-panel__header">
        <h2 id="recent-title">
          <PencilLine size={22} aria-hidden="true" />
          Последняя практика
        </h2>
        <span className="poster-panel__eyebrow">Твоя история в деталях</span>
      </header>
      {view.recent.length ? (
        <ul className="recent-list poster-recent__list">
          {view.recent.map((attempt) => (
            <li key={attempt.id}>
              <Link
                to={`/subjects/${attempt.subject.code}/exercises/${attempt.exerciseId}`}
              >
                <span
                  className={`poster-rank poster-rank--${attempt.subject.code}`}
                  aria-hidden="true"
                >
                  №{attempt.exercise.number}
                </span>
                <div>
                  <strong>
                    {attempt.subject.title} · {attempt.exercise.title}
                  </strong>
                  <span>{formatDate(attempt.solvedAt)}</span>
                </div>
                <Badge tone={attempt.isCorrect ? 'success' : 'danger'}>
                  {attempt.isCorrect ? 'Правильно' : 'Неправильно'}
                </Badge>
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="poster-recent__empty">
          <div className="answer-boxes" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <h3>Здесь начнётся твоя история</h3>
          <p>
            Записывай решения в своём темпе.
            <br />И замечай, как маленькие шаги становятся практикой.
          </p>
          <Link to="/subjects">
            Выбрать предмет <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      )}
    </section>
  );
}

export function PosterMotivation({ weeklyTotal }: { weeklyTotal: number }) {
  return (
    <section
      className="poster-panel poster-motivation"
      aria-labelledby="motivation-title"
    >
      <header className="poster-panel__header">
        <h2 id="motivation-title">Выше с каждым шагом</h2>
        <ArrowUpRight size={23} aria-hidden="true" />
      </header>
      <div className="poster-motivation__body">
        <blockquote>
          Не обязательно быть лучше всех.
          <br />
          <strong>Достаточно двигаться вперёд.</strong>
        </blockquote>
        <img
          src={publicAsset('illustrations/mountain.svg')}
          alt=""
          aria-hidden="true"
          width={340}
          height={220}
          loading="lazy"
        />
      </div>
      <div className="poster-motivation__bottom">
        <span>Решений за 7 дней</span>
        <strong>{weeklyTotal}</strong>
        <span className="poster-handwritten">Каждое считается.</span>
      </div>
    </section>
  );
}

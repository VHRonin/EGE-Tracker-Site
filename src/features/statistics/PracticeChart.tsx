import type { DailyPractice } from '../../domain/statistics';

export function PracticeChart({ days }: { days: DailyPractice[] }) {
  const maximum = days.reduce((value, day) => Math.max(value, day.total), 1);
  const x = (index: number) =>
    35 + (index * 630) / Math.max(1, days.length - 1);
  const line = days
    .map((day, index) => {
      if (day.accuracy === null) {
        return '';
      }
      const point = `${days[index - 1]?.accuracy != null ? 'L' : 'M'}${x(index)},${180 - day.accuracy * 140}`;
      return point;
    })
    .join(' ');
  const dateLabel = (value: string) =>
    new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short' }).format(
      new Date(`${value}T12:00:00`),
    );
  return (
    <div className="chart-grid">
      <figure className="card chart-card">
        <figcaption>Объём практики по дням</figcaption>
        <p className="help-text">
          Синий — правильно, коралловый — неправильно. Точные значения доступны
          в таблице ниже.
        </p>
        <svg
          viewBox="0 0 700 230"
          role="img"
          aria-label={`Решения по дням, максимум ${maximum} за день`}
        >
          <line x1="30" y1="180" x2="680" y2="180" className="chart-axis" />
          <text x="5" y="184">
            0
          </text>
          <text x="3" y="44">
            {maximum}
          </text>
          {days.map((day, index) => {
            const width = Math.min(16, 620 / days.length);
            const left = x(index) - width / 2;
            const green = (140 * day.correct) / maximum;
            const red = (140 * day.incorrect) / maximum;
            return (
              <g key={day.date}>
                <rect
                  x={left}
                  y={180 - green}
                  width={width}
                  height={green}
                  className="chart-correct"
                />
                <rect
                  x={left}
                  y={180 - green - red}
                  width={width}
                  height={red}
                  className="chart-incorrect"
                />
              </g>
            );
          })}
          <text x="30" y="216">
            {dateLabel(days[0]!.date)}
          </text>
          <text x="665" y="216" textAnchor="end">
            {dateLabel(days.at(-1)!.date)}
          </text>
        </svg>
      </figure>
      <figure className="card chart-card">
        <figcaption>Точность по дням</figcaption>
        <p className="help-text">
          Доля правильных ответов за день. Дни без решений не получают процент
          точности.
        </p>
        <svg
          viewBox="0 0 700 230"
          role="img"
          aria-label="Общая точность по дням от 0 до 100 процентов"
        >
          <line x1="30" y1="180" x2="680" y2="180" className="chart-axis" />
          <text x="0" y="184">
            0 %
          </text>
          <text x="0" y="30">
            100 %
          </text>
          <path
            d={line}
            fill="none"
            className="chart-accuracy-line"
            strokeWidth="2"
          />
          {days.map(
            (day, index) =>
              day.accuracy !== null && (
                <circle
                  key={day.date}
                  cx={x(index)}
                  cy={180 - day.accuracy * 140}
                  r={days.length > 90 ? 1.5 : 3}
                  className="chart-accuracy-point"
                />
              ),
          )}
          <text x="30" y="216">
            {dateLabel(days[0]!.date)}
          </text>
          <text x="665" y="216" textAnchor="end">
            {dateLabel(days.at(-1)!.date)}
          </text>
        </svg>
      </figure>
    </div>
  );
}

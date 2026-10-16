import { useState } from 'react';
import { ChartNoAxesCombined } from 'lucide-react';
import { useStatistics } from '../../application/queries';
import { periodRange } from '../../domain/statistics';
import { percentage } from '../../shared/format';
import { Card } from '../../shared/ui/Card';
import { EmptyState } from '../../shared/ui/EmptyState';
import { PageHeading } from '../../shared/ui/PageHeading';
import { QueryFeedback } from '../../shared/ui/QueryFeedback';
import { SelectField, TextField } from '../../shared/ui/FormControls';
import { PracticeChart } from './PracticeChart';

export function StatisticsPage() {
  const [subject, setSubject] = useState('all');
  const [period, setPeriod] = useState('30');
  const [range, setRange] = useState(() => periodRange(Date.now(), 30));
  const query = useStatistics(subject, period, range.start, range.end);
  return (
    <>
      <PageHeading
        eyebrow="ЗАМЕЧАЙ СВОЙ ПРОГРЕСС"
        title="Статистика"
        visual={
          <span className="poster-heading-stamp">
            <ChartNoAxesCombined size={88} strokeWidth={1.2} />
          </span>
        }
        description="Объём практики и общая точность по локальным дням. Только реальные записи из твоей истории."
      />
      <div className="catalog-filters statistics-filters">
        <SelectField
          label="Предмет статистики"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
        >
          <option value="all">Все предметы</option>
          <option value="math">Математика</option>
          <option value="russian">Русский язык</option>
          <option value="informatics">Информатика</option>
        </SelectField>
        <SelectField
          label="Период статистики"
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
        >
          <option value="7">7 дней</option>
          <option value="30">30 дней</option>
          <option value="90">90 дней</option>
          <option value="365">365 дней</option>
          <option value="custom">Выбрать даты</option>
        </SelectField>
        {period === 'custom' && (
          <>
            <TextField
              label="Начало периода"
              type="date"
              value={range.start}
              onChange={(event) =>
                setRange({ ...range, start: event.target.value })
              }
            />
            <TextField
              label="Конец периода"
              type="date"
              value={range.end}
              onChange={(event) =>
                setRange({ ...range, end: event.target.value })
              }
            />
          </>
        )}
      </div>
      {query.status !== 'ready' ? (
        <QueryFeedback
          error={query.status === 'error' ? query.message : undefined}
        />
      ) : (
        <>
          <p className="help-text results-count">
            Период: {query.data.range.start} — {query.data.range.end}. Даты в
            часовом поясе браузера.
          </p>
          <div className="summary-grid page-section">
            <div className="card summary-tile">
              <span>Решений за период</span>
              <strong>{query.data.total}</strong>
            </div>
            <div className="card summary-tile">
              <span>Правильно / неправильно</span>
              <strong>
                {query.data.correct} / {query.data.incorrect}
              </strong>
            </div>
            <div className="card summary-tile">
              <span>Общая точность за период</span>
              <strong>{percentage(query.data.accuracy)}</strong>
            </div>
          </div>
          {query.data.total ? (
            <>
              <PracticeChart days={query.data.days} />
              <details className="card statistics-table">
                <summary>Таблица решений по дням</summary>
                <div
                  className="table-scroll"
                  role="region"
                  aria-label="Таблица статистики по дням"
                  tabIndex={0}
                >
                  <table>
                    <caption>Объём практики и точность по дням</caption>
                    <thead>
                      <tr>
                        <th scope="col">Дата</th>
                        <th scope="col">Правильно</th>
                        <th scope="col">Неправильно</th>
                        <th scope="col">Всего</th>
                        <th scope="col">Точность</th>
                      </tr>
                    </thead>
                    <tbody>
                      {query.data.days.map((day) => (
                        <tr key={day.date}>
                          <th scope="row">{day.date}</th>
                          <td>{day.correct}</td>
                          <td>{day.incorrect}</td>
                          <td>{day.total}</td>
                          <td>{percentage(day.accuracy)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          ) : (
            <Card>
              <EmptyState
                icon={ChartNoAxesCombined}
                title="За этот период нет решений"
                description="Выбери другой период или предмет либо добавь новое решение."
              />
            </Card>
          )}
        </>
      )}
    </>
  );
}

import { publicAsset } from '../../shared/assets';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Subject } from '../../domain/entities';
import { percentage } from '../../shared/format';
import { subjectNavigation } from './subjectNavigation';

export function IllustratedSubjectCard({
  subject,
  total,
  accuracy,
  headingLevel = 3,
}: {
  subject: Subject;
  total: number;
  accuracy?: number | null;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const index = subjectNavigation.findIndex(
    (item) => item.code === subject.code,
  );
  const presentation = subjectNavigation[index]!;
  return (
    <Link
      to={`/subjects/${subject.code}`}
      className={`subject-card poster-subject poster-subject--${subject.code}`}
    >
      <div className="poster-subject__art">
        <img
          src={publicAsset(`illustrations/${subject.code}.svg`)}
          alt=""
          aria-hidden="true"
          width={260}
          height={230}
        />
        <span className="poster-subject__number" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>
      <div className="poster-subject__body">
        <Heading>{subject.title}</Heading>
        <p className="poster-subject__subtitle">{presentation.subtitle}</p>
        <div className="poster-subject__metrics">
          {total ? (
            <>
              <span>
                Решений: <strong>{total}</strong>
              </span>
              {accuracy !== undefined && (
                <span>
                  Общая точность: <strong>{percentage(accuracy)}</strong>
                </span>
              )}
            </>
          ) : (
            <span>Пока нет решений</span>
          )}
        </div>
        <span className="poster-subject__open">
          Открыть предмет <ArrowUpRight size={18} aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

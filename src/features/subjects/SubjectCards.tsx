import { useSubjects } from '../../application/queries';
import { QueryFeedback } from '../../shared/ui/QueryFeedback';
import { IllustratedSubjectCard } from './IllustratedSubjectCard';

export function SubjectCards({ headingLevel = 2 }: { headingLevel?: 2 | 3 }) {
  const query = useSubjects();
  if (query.status !== 'ready')
    return (
      <QueryFeedback
        error={query.status === 'error' ? query.message : undefined}
      />
    );
  return (
    <div className="poster-subject-grid subject-catalog">
      {query.data.map((subject) => (
        <IllustratedSubjectCard
          key={subject.id}
          subject={subject}
          total={subject.attemptCount}
          headingLevel={headingLevel}
        />
      ))}
    </div>
  );
}

import type { HomeView } from './useHomeView';
import { IllustratedSubjectCard } from '../subjects/IllustratedSubjectCard';

export function PosterSubjects({
  subjects,
}: {
  subjects: HomeView['subjects'];
}) {
  return (
    <section className="poster-subjects" aria-labelledby="subjects-title">
      <div className="poster-section-heading">
        <h2 id="subjects-title">Три предмета. Твоя траектория.</h2>
        <span>Выбирай, с чего начнём</span>
      </div>
      <div className="poster-subject-grid">
        {subjects.map((subject) => (
          <IllustratedSubjectCard
            key={subject.id}
            subject={subject}
            total={subject.total}
            accuracy={subject.accuracy}
          />
        ))}
      </div>
    </section>
  );
}

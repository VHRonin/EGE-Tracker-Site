import { QueryFeedback } from '../../shared/ui/QueryFeedback';
import { useHomeView } from './useHomeView';
import { PosterHero } from './PosterHero';
import { PosterSubjects } from './PosterSubjects';
import {
  PosterMotivation,
  PosterRecent,
  PosterReview,
  PosterTotals,
  PosterWeekly,
} from './PosterPanels';

export function DashboardPage() {
  const query = useHomeView();
  return (
    <div className="poster-dashboard">
      <PosterHero
        lastSolvedAt={query.status === 'ready' ? query.data.lastSolvedAt : null}
        pending={query.status === 'loading'}
        unavailable={query.status === 'error'}
      />
      {query.status === 'ready' ? (
        <>
          <PosterSubjects subjects={query.data.subjects} />
          <div className="poster-analysis">
            <PosterReview view={query.data} />
            <PosterWeekly view={query.data} />
            <PosterTotals view={query.data} />
          </div>
          <div className="poster-bottom">
            <PosterRecent view={query.data} />
            <PosterMotivation weeklyTotal={query.data.weekly.total} />
          </div>
          <p className="poster-data-note">
            <span aria-hidden="true">[ ✓ ]</span> Данные в твоём браузере. Для
            переноса сохрани{' '}
            <a href="#/settings">резервную копию в настройках</a>.
          </p>
        </>
      ) : (
        <QueryFeedback
          error={query.status === 'error' ? query.message : undefined}
        />
      )}
    </div>
  );
}

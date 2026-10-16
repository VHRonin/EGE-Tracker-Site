import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { SubjectsPage, SubjectPage } from '../features/subjects/SubjectsPage';
import { ReviewPage } from '../features/review/ReviewPage';
import { StatisticsPage } from '../features/statistics/StatisticsPage';
import { SettingsPage } from '../features/backup/SettingsPage';
import { NotFoundPage } from '../shared/ui/NotFoundPage';
import { ExerciseRoute } from '../features/exercises/ExercisePage';

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="subjects" element={<SubjectsPage />} />
        <Route path="subjects/:subjectCode" element={<SubjectPage />} />
        <Route
          path="subjects/:subjectCode/exercises/:exerciseId"
          element={<ExerciseRoute />}
        />
        <Route path="review" element={<ReviewPage />} />
        <Route path="statistics" element={<StatisticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

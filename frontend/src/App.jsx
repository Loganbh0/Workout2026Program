import { Routes, Route, Navigate } from 'react-router-dom';
import BottomNav from './components/BottomNav.jsx';
import HomePage from './pages/HomePage.jsx';
import TodayPage from './pages/TodayPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import SessionDetailPage from './pages/SessionDetailPage.jsx';
import ProgressPage from './pages/ProgressPage.jsx';
import ProgramDetailPage from './pages/ProgramDetailPage.jsx';

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/today" element={<TodayPage />} />
        <Route path="/programs/:id" element={<ProgramDetailPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/history/:id" element={<SessionDetailPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </div>
  );
}

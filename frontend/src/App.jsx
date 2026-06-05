import { Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav.jsx';
import TodayPage from './pages/TodayPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import SessionDetailPage from './pages/SessionDetailPage.jsx';
import ProgressPage from './pages/ProgressPage.jsx';

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<TodayPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/history/:id" element={<SessionDetailPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="*" element={<TodayPage />} />
      </Routes>
      <BottomNav />
    </div>
  );
}

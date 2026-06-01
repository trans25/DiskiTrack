import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppLayout from './components/AppLayout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Teams from './pages/Teams.jsx';
import Players from './pages/Players.jsx';
import Matches from './pages/Matches.jsx';
import LiveMatch from './pages/LiveMatch.jsx';
import MatchHistory from './pages/MatchHistory.jsx';
import PlayerProfile from './pages/PlayerProfile.jsx';
import Analytics from './pages/Analytics.jsx';
import ClubUsers from './pages/ClubUsers.jsx';

export default function App() {
  const { loading } = useAuth();
  if (loading) return null;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/teams" element={<Teams />} />
        <Route path="/players" element={<Players />} />
        <Route path="/players/:id" element={<PlayerProfile />} />
        <Route path="/matches" element={<Matches />} />
        <Route path="/matches/:id/live" element={<LiveMatch />} />
        <Route path="/history" element={<MatchHistory />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/users" element={<ClubUsers />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

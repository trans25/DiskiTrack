import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppLayout from './components/AppLayout.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import SetPassword from './pages/SetPassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Teams from './pages/Teams.jsx';
import Players from './pages/Players.jsx';
import Matches from './pages/Matches.jsx';
import LiveMatch from './pages/LiveMatch.jsx';
import MatchHistory from './pages/MatchHistory.jsx';
import PlayerProfile from './pages/PlayerProfile.jsx';
import Analytics from './pages/Analytics.jsx';
import ClubUsers from './pages/ClubUsers.jsx';
import Announcements from './pages/Announcements.jsx';
import Training from './pages/Training.jsx';
import Standings from './pages/Standings.jsx';
import Applications from './pages/Applications.jsx';
import Reviews from './pages/Reviews.jsx';

export default function App() {
  const { loading } = useAuth();
  if (loading) return null;

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<SetPassword purpose="RESET" />} />
      <Route path="/accept-invite" element={<SetPassword purpose="INVITE" />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/teams" element={<Teams />} />
        <Route path="/players" element={<Players />} />
        <Route path="/players/:id" element={<PlayerProfile />} />
        <Route path="/matches" element={<Matches />} />
        <Route path="/matches/:id/live" element={<LiveMatch />} />
        <Route path="/history" element={<MatchHistory />} />
        <Route path="/standings" element={<Standings />} />
        <Route path="/training" element={<Training />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/users" element={<ClubUsers />} />
        <Route path="/admin/applications" element={<Applications />} />
        <Route path="/admin/reviews" element={<Reviews />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppLayout from './components/AppLayout.jsx';
// Public entry pages stay eager so the first paint is instant.
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import SetPassword from './pages/SetPassword.jsx';

// Authenticated pages are code-split so they only download when visited.
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Teams = lazy(() => import('./pages/Teams.jsx'));
const Players = lazy(() => import('./pages/Players.jsx'));
const Matches = lazy(() => import('./pages/Matches.jsx'));
const LiveMatch = lazy(() => import('./pages/LiveMatch.jsx'));
const MatchHistory = lazy(() => import('./pages/MatchHistory.jsx'));
const PlayerProfile = lazy(() => import('./pages/PlayerProfile.jsx'));
const Analytics = lazy(() => import('./pages/Analytics.jsx'));
const ClubUsers = lazy(() => import('./pages/ClubUsers.jsx'));
const Announcements = lazy(() => import('./pages/Announcements.jsx'));
const Training = lazy(() => import('./pages/Training.jsx'));
const Standings = lazy(() => import('./pages/Standings.jsx'));
const Applications = lazy(() => import('./pages/Applications.jsx'));
const Reviews = lazy(() => import('./pages/Reviews.jsx'));
const Billing = lazy(() => import('./pages/Billing.jsx'));
const Privacy = lazy(() => import('./pages/Privacy.jsx'));
const AuditLog = lazy(() => import('./pages/AuditLog.jsx'));

const PageFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
    <CircularProgress />
  </Box>
);

export default function App() {
  const { loading } = useAuth();
  if (loading) return null;

  return (
    <Suspense fallback={<PageFallback />}>
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
          <Route path="/billing" element={<Billing />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/admin/audit" element={<AuditLog />} />
          <Route path="/admin/applications" element={<Applications />} />
          <Route path="/admin/reviews" element={<Reviews />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

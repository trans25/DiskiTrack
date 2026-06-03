import { Box, Typography } from '@mui/material';
import { useAuth } from '../context/AuthContext.jsx';
import { useAnnouncements } from '../context/AnnouncementsContext.jsx';
import AnalystAnalytics from '../components/AnalystAnalytics.jsx';
import PinnedAnnouncements from '../components/PinnedAnnouncements.jsx';

/**
 * Analyst dashboard: all of the team's reports in charts, with tabs that surface
 * the analyst's own logged reports.
 */
export default function AnalystDashboard() {
  const { user } = useAuth();
  const { items: announcements } = useAnnouncements();

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={1}>
        Welcome, {user?.firstName}
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        All team reports at a glance — switch to “My Reports” to see what you have logged.
      </Typography>

      <PinnedAnnouncements announcements={announcements} />

      <AnalystAnalytics />
    </Box>
  );
}

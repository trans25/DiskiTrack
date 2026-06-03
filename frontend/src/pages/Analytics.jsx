import { Box, Typography } from '@mui/material';
import { useAuth } from '../context/AuthContext.jsx';
import ClubAnalytics from '../components/ClubAnalytics.jsx';
import AnalystAnalytics from '../components/AnalystAnalytics.jsx';
import PlatformAnalytics from '../components/PlatformAnalytics.jsx';

/**
 * Role-aware analytics hub.
 * - SYSTEM_ADMIN -> cross-tenant platform analytics
 * - ANALYST -> tabbed dashboard: team reports + their own reports
 * - CLUB_ADMIN / COACH -> club-wide analytics with clickable charts
 */
export default function Analytics() {
  const { user } = useAuth();
  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
  const isAnalyst = user?.role === 'ANALYST';

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={0.5}>
        Analytics
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        {isSystemAdmin
          ? 'Platform performance across every club. Click a club bar for details.'
          : isAnalyst
            ? 'All team reports in charts, plus the reports you have logged yourself.'
            : 'Your club at a glance. Click any chart to drill into players and teams.'}
      </Typography>

      {isSystemAdmin ? (
        <PlatformAnalytics />
      ) : isAnalyst ? (
        <AnalystAnalytics />
      ) : (
        <ClubAnalytics />
      )}
    </Box>
  );
}

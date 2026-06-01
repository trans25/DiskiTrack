import { useEffect, useState } from 'react';
import { Typography, Box } from '@mui/material';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { api } from '../api/client.js';
import ChartCard from './ChartCard.jsx';
import TeamOverviewDialog from './TeamOverviewDialog.jsx';

const ACCENT = '#16a34a';
const WARN = '#ca8a04';
const DANGER = '#dc2626';

/**
 * Coach performance panel: W/D/L per team with clickable bars that open the
 * team overview. Scoped to the coach's own teams server-side.
 */
export default function CoachPerformancePanel() {
  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState(null);

  useEffect(() => {
    api.get('/analytics/coach/performance').then((res) => setTeams(res.data.teams || []));
  }, []);

  const hasPlayed = teams.some((t) => t.played > 0);

  return (
    <>
      <ChartCard
        title="Team Performance"
        subtitle="Results per team — click a bar for the team overview"
        height={280}
      >
        {!hasPlayed ? (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Typography variant="body2" color="text.secondary">
              No finished matches yet. Results will appear here once your teams play.
            </Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={teams}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="wins" name="Wins" stackId="r" fill={ACCENT} cursor="pointer"
                onClick={(d) => d?.id && setTeamId(d.id)} />
              <Bar dataKey="draws" name="Draws" stackId="r" fill={WARN} cursor="pointer"
                onClick={(d) => d?.id && setTeamId(d.id)} />
              <Bar dataKey="losses" name="Losses" stackId="r" fill={DANGER} cursor="pointer"
                onClick={(d) => d?.id && setTeamId(d.id)} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <TeamOverviewDialog teamId={teamId} open={Boolean(teamId)} onClose={() => setTeamId(null)} />
    </>
  );
}

import { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Stack,
  CircularProgress,
} from '@mui/material';
import ApartmentIcon from '@mui/icons-material/Apartment';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { api } from '../api/client.js';
import ChartCard from './ChartCard.jsx';
import TeamOverviewDialog from './TeamOverviewDialog.jsx';

const COLORS = ['#1565c0', '#16a34a', '#ca8a04', '#dc2626', '#7c3aed', '#0891b2'];

const StatTile = ({ icon, label, value }) => (
  <Grid item xs={6} sm={4} md={2.4}>
    <Card>
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ color: 'primary.main' }}>{icon}</Box>
          <Box>
            <Typography variant="h5" fontWeight={700} lineHeight={1.1}>
              {value ?? 0}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  </Grid>
);

/**
 * Cross-tenant platform analytics for SYSTEM_ADMIN.
 * Per-club players/teams/matches bar chart and a role distribution pie.
 */
export default function PlatformAnalytics() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/analytics/platform').then((res) => setData(res.data));
  }, []);

  if (!data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const byClub = data.byClub;
  const roles = data.rolesDistribution.map((r) => ({
    name: r.role.replace('_', ' '),
    value: r.count,
  }));

  return (
    <Box>
      <Grid container spacing={2} mb={1}>
        <StatTile icon={<ApartmentIcon />} label="Clubs" value={data.totals?.clubs} />
        <StatTile icon={<GroupsIcon />} label="Teams" value={data.totals?.teams} />
        <StatTile icon={<PersonIcon />} label="Players" value={data.totals?.players} />
        <StatTile icon={<SportsSoccerIcon />} label="Matches" value={data.totals?.matches} />
        <StatTile icon={<LiveTvIcon />} label="Live Now" value={data.totals?.live_matches} />
      </Grid>

      <Grid container spacing={2} mt={0}>
        <Grid item xs={12} md={8}>
          <ChartCard title="Clubs Breakdown" subtitle="Players, teams and matches per club" height={340}>
            {byClub.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No clubs yet.
              </Typography>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byClub}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={70} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="players" name="Players" fill="#1565c0" />
                  <Bar dataKey="teams" name="Teams" fill="#16a34a" />
                  <Bar dataKey="matches" name="Matches" fill="#ca8a04" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </Grid>

        <Grid item xs={12} md={4}>
          <ChartCard title="Users by Role" subtitle="Across all clubs" height={340}>
            {roles.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No users yet.
              </Typography>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={roles} dataKey="value" nameKey="name" outerRadius={100} label>
                    {roles.map((entry, i) => (
                      <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  );
}

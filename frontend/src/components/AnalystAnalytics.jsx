import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Stack,
  Tabs,
  Tab,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  Divider,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import EventNoteIcon from '@mui/icons-material/EventNote';
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
import ClubAnalytics from './ClubAnalytics.jsx';

const PRIMARY = '#1565c0';
const EVENT_COLORS = [
  '#1565c0', '#16a34a', '#ca8a04', '#dc2626', '#7c3aed',
  '#0891b2', '#db2777', '#65a30d',
];

const StatTile = ({ icon, label, value }) => (
  <Grid item xs={6} sm={4}>
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

const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString();
};

/**
 * "My Reports" tab — charts driven by the events this analyst personally logged.
 */
function MyReports() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .get('/analytics/my-reports')
      .then((res) => active && setData(res.data))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  const totals = data?.totals ?? {};
  const eventDistribution = data?.eventDistribution ?? [];
  const trend = data?.trend ?? [];
  const recentMatches = data?.recentMatches ?? [];

  const hasReports = (totals.events_logged ?? 0) > 0;

  if (!hasReports) {
    return (
      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            No reports yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Events you log during live matches will appear here as your personal reports.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        <StatTile icon={<EventNoteIcon />} label="Events logged" value={totals.events_logged} />
        <StatTile icon={<SportsSoccerIcon />} label="Matches covered" value={totals.matches_covered} />
        <StatTile icon={<AssessmentIcon />} label="Goals logged" value={totals.goals_logged} />
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <ChartCard title="Events logged over time" subtitle="Your tagging activity per month">
            <ResponsiveContainer>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="events" name="Events" fill={PRIMARY} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <ChartCard title="Event breakdown" subtitle="Types of events you have recorded">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={eventDistribution}
                  dataKey="count"
                  nameKey="event_type"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(e) => e.event_type}
                >
                  {eventDistribution.map((entry, i) => (
                    <Cell key={entry.event_type} fill={EVENT_COLORS[i % EVENT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Recent match reports
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Matches you tagged. Click to open the live report.
          </Typography>
          <List dense sx={{ mt: 1 }}>
            {recentMatches.map((m, i) => (
              <Box key={m.id}>
                {i > 0 && <Divider component="li" />}
                <ListItemButton onClick={() => navigate(`/matches/${m.id}`)}>
                  <ListItemText
                    primary={`${m.home_team_name} ${m.home_score ?? 0} - ${m.away_score ?? 0} ${m.away_team_name}`}
                    secondary={formatDate(m.scheduled_at)}
                  />
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip size="small" label={`${m.events_logged} events`} />
                    <Chip
                      size="small"
                      color={m.status === 'LIVE' ? 'error' : 'default'}
                      label={m.status}
                    />
                  </Stack>
                </ListItemButton>
              </Box>
            ))}
          </List>
        </CardContent>
      </Card>
    </Stack>
  );
}

/**
 * Analyst dashboard:
 * - "Team Reports" tab -> club-wide charts (all the team's reports)
 * - "My Reports" tab -> the analyst's own logged reports
 */
export default function AnalystAnalytics() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Team Reports" />
        <Tab label="My Reports" />
      </Tabs>

      {tab === 0 ? <ClubAnalytics /> : <MyReports />}
    </Box>
  );
}

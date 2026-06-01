import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Stack,
  CircularProgress,
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
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

const PRIMARY = '#1565c0';
const ACCENT = '#16a34a';
const WARN = '#ca8a04';
const DANGER = '#dc2626';
const EVENT_COLORS = [
  '#1565c0', '#16a34a', '#ca8a04', '#dc2626', '#7c3aed',
  '#0891b2', '#db2777', '#65a30d',
];

const StatTile = ({ icon, label, value }) => (
  <Grid item xs={6} sm={3}>
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
 * Club-wide analytics with clickable charts.
 * - Top scorers bar -> player profile
 * - Standings bar -> team overview dialog
 * - Goals trend line, event distribution pie, discipline bars
 */
export default function ClubAnalytics() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [teamId, setTeamId] = useState(null);

  useEffect(() => {
    api.get('/analytics/club').then((res) => setData(res.data));
  }, []);

  if (!data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const scorers = data.topScorers.map((p) => ({
    ...p,
    name: `${p.first_name} ${p.last_name}`,
  }));
  const standings = data.standings;
  const goalsTrend = data.goalsTrend;
  const eventDist = data.eventDistribution.map((e) => ({
    name: e.event_type.replace('_', ' '),
    value: e.count,
  }));
  const discipline = data.discipline;

  return (
    <Box>
      <Grid container spacing={2} mb={1}>
        <StatTile icon={<GroupsIcon />} label="Teams" value={data.totals?.teams} />
        <StatTile icon={<PersonIcon />} label="Players" value={data.totals?.players} />
        <StatTile icon={<SportsSoccerIcon />} label="Matches Played" value={data.totals?.matches_played} />
        <StatTile icon={<EmojiEventsIcon />} label="Goals Scored" value={data.totals?.goals} />
      </Grid>

      <Grid container spacing={2} mt={0}>
        {/* Top scorers - clickable bars -> player profile */}
        <Grid item xs={12} md={6}>
          <ChartCard
            title="Top Scorers"
            subtitle="Click a bar to open the player profile"
          >
            {scorers.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No goals recorded yet.
              </Typography>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scorers} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="goals"
                    name="Goals"
                    fill={PRIMARY}
                    cursor="pointer"
                    onClick={(d) => d?.id && navigate(`/players/${d.id}`)}
                  />
                  <Bar
                    dataKey="assists"
                    name="Assists"
                    fill={ACCENT}
                    cursor="pointer"
                    onClick={(d) => d?.id && navigate(`/players/${d.id}`)}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </Grid>

        {/* Standings - clickable bars -> team overview */}
        <Grid item xs={12} md={6}>
          <ChartCard
            title="Team Standings"
            subtitle="Click a bar to open the team overview"
          >
            {standings.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No teams yet.
              </Typography>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={standings} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
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
        </Grid>

        {/* Goals trend line */}
        <Grid item xs={12} md={7}>
          <ChartCard title="Goals Over Time" subtitle="Monthly goals scored by your teams">
            {goalsTrend.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No scoring history yet.
              </Typography>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={goalsTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="goals" name="Goals" stroke={PRIMARY} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </Grid>

        {/* Event distribution pie */}
        <Grid item xs={12} md={5}>
          <ChartCard title="Match Events" subtitle="Distribution of all logged events">
            {eventDist.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No events logged yet.
              </Typography>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={eventDist} dataKey="value" nameKey="name" outerRadius={90} label>
                    {eventDist.map((entry, i) => (
                      <Cell key={entry.name} fill={EVENT_COLORS[i % EVENT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </Grid>

        {/* Discipline */}
        <Grid item xs={12}>
          <ChartCard title="Discipline by Team" subtitle="Cards and fouls per team" height={280}>
            {discipline.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No disciplinary data yet.
              </Typography>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={discipline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="yellow" name="Yellow" fill={WARN} />
                  <Bar dataKey="red" name="Red" fill={DANGER} />
                  <Bar dataKey="fouls" name="Fouls" fill={PRIMARY} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </Grid>
      </Grid>

      <TeamOverviewDialog teamId={teamId} open={Boolean(teamId)} onClose={() => setTeamId(null)} />
    </Box>
  );
}

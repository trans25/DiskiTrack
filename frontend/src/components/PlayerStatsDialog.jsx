import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
  Stack,
  Avatar,
  Typography,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
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

const PRIMARY = '#1565c0';
const ACCENT = '#16a34a';
const WARN = '#ca8a04';
const DANGER = '#dc2626';

const StatTile = ({ label, value, color = PRIMARY }) => (
  <Grid item xs={6} sm={3}>
    <Card variant="outlined" sx={{ bgcolor: 'background.default', textAlign: 'center' }}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="h5" fontWeight={700} sx={{ color }}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
      </CardContent>
    </Card>
  </Grid>
);

const ChartCard = ({ title, children }) => (
  <Card variant="outlined" sx={{ height: '100%' }}>
    <CardContent>
      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      <Box sx={{ width: '100%', height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </Box>
    </CardContent>
  </Card>
);

export default function PlayerStatsDialog({ playerId, open, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !playerId) return;
    setLoading(true);
    api
      .get(`/players/${playerId}/profile`)
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [playerId, open]);

  const totals = data?.totals;
  const perMatch = data?.perMatch ?? [];

  const disciplineData = totals
    ? [
        { name: 'Yellow', value: totals.yellow_cards },
        { name: 'Red', value: totals.red_cards },
        { name: 'Fouls', value: totals.fouls },
      ].filter((d) => d.value > 0)
    : [];

  const radarData = totals
    ? [
        { metric: 'Goals', value: totals.goals },
        { metric: 'Assists', value: totals.assists },
        { metric: 'Shots', value: totals.shots },
        { metric: 'Apps', value: totals.matches_played },
        { metric: 'Fouls', value: totals.fouls },
      ]
    : [];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      {loading || !data ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
          {loading ? <CircularProgress /> : <Typography>No data.</Typography>}
        </Box>
      ) : (
        <>
          <DialogTitle sx={{ pb: 1 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                src={data.player.photoUrl || undefined}
                sx={{ width: 56, height: 56, fontSize: '1.1rem', bgcolor: 'primary.light', color: 'primary.dark' }}
              >
                {data.player.firstName?.[0]}
                {data.player.lastName?.[0]}
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                  {data.player.firstName} {data.player.lastName}
                  {data.player.jerseyNumber != null && (
                    <Typography component="span" color="text.secondary" sx={{ ml: 1 }}>
                      #{data.player.jerseyNumber}
                    </Typography>
                  )}
                </Typography>
                <Stack direction="row" spacing={1} mt={0.5} flexWrap="wrap" useFlexGap>
                  {data.player.position && (
                    <Chip label={data.player.position} size="small" color="primary" />
                  )}
                  {data.player.ageGroup && (
                    <Chip label={data.player.ageGroup} size="small" variant="outlined" />
                  )}
                  {data.player.teamName && (
                    <Chip label={data.player.teamName} size="small" variant="outlined" />
                  )}
                  {data.player.age != null && (
                    <Chip label={`${data.player.age} yrs`} size="small" variant="outlined" />
                  )}
                </Stack>
              </Box>
            </Stack>
          </DialogTitle>

          <DialogContent dividers>
            {/* Career totals */}
            <Grid container spacing={1.5} sx={{ mb: 1 }}>
              <StatTile label="Appearances" value={totals.matches_played} />
              <StatTile label="Goals" value={totals.goals} color={ACCENT} />
              <StatTile label="Assists" value={totals.assists} color={PRIMARY} />
              <StatTile label="Shots" value={totals.shots} />
              <StatTile label="Minutes" value={totals.minutes_played} />
              <StatTile label="Shot Conv. %" value={data.shotConversion} color={ACCENT} />
              <StatTile label="Yellow Cards" value={totals.yellow_cards} color={WARN} />
              <StatTile label="Red Cards" value={totals.red_cards} color={DANGER} />
            </Grid>

            {/* Averages */}
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
              <Chip label={`${data.averages.goalsPerMatch} goals/match`} size="small" variant="outlined" />
              <Chip label={`${data.averages.assistsPerMatch} assists/match`} size="small" variant="outlined" />
              <Chip label={`${data.averages.shotsPerMatch} shots/match`} size="small" variant="outlined" />
              <Chip label={`${data.averages.minutesPerMatch} min/match`} size="small" variant="outlined" />
            </Stack>

            {perMatch.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No match data recorded yet — charts will appear once this player has match stats.
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {/* Goals & assists trend */}
                <Grid item xs={12} md={6}>
                  <ChartCard title="Goals & Assists per Match">
                    <LineChart data={perMatch} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                      <XAxis dataKey="index" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip
                        labelFormatter={(i) => perMatch[i - 1]?.label || `Match ${i}`}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="goals" name="Goals" stroke={ACCENT} strokeWidth={2} />
                      <Line type="monotone" dataKey="assists" name="Assists" stroke={PRIMARY} strokeWidth={2} />
                    </LineChart>
                  </ChartCard>
                </Grid>

                {/* Shots per match */}
                <Grid item xs={12} md={6}>
                  <ChartCard title="Shots per Match">
                    <BarChart data={perMatch} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                      <XAxis dataKey="index" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip labelFormatter={(i) => perMatch[i - 1]?.label || `Match ${i}`} />
                      <Bar dataKey="shots" name="Shots" fill={PRIMARY} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartCard>
                </Grid>

                {/* Performance radar */}
                <Grid item xs={12} md={6}>
                  <ChartCard title="Performance Overview">
                    <RadarChart data={radarData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                      <PolarRadiusAxis tick={{ fontSize: 10 }} />
                      <Radar name="Career" dataKey="value" stroke={PRIMARY} fill={PRIMARY} fillOpacity={0.4} />
                    </RadarChart>
                  </ChartCard>
                </Grid>

                {/* Discipline pie */}
                <Grid item xs={12} md={6}>
                  <ChartCard title="Discipline Breakdown">
                    {disciplineData.length === 0 ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <Typography variant="body2" color="text.secondary">
                          Clean record — no fouls or cards.
                        </Typography>
                      </Box>
                    ) : (
                      <PieChart>
                        <Pie
                          data={disciplineData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={50}
                          outerRadius={90}
                          paddingAngle={2}
                          label
                        >
                          {disciplineData.map((d) => (
                            <Cell
                              key={d.name}
                              fill={d.name === 'Red' ? DANGER : d.name === 'Yellow' ? WARN : '#94a3b8'}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    )}
                  </ChartCard>
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button variant="text" onClick={onClose}>
              Close
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Stack,
  Chip,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { api } from '../api/client.js';
import CoachPerformancePanel from '../components/CoachPerformancePanel.jsx';

const statusColor = { SCHEDULED: 'default', LIVE: 'error', FINISHED: 'primary' };

const fmtDateTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString(
    undefined,
    { hour: '2-digit', minute: '2-digit' }
  )}`;
};

/**
 * Coach home: their teams, upcoming fixtures (with quick live access) and
 * upcoming training sessions.
 */
export default function CoachDashboard({ firstName }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/coach/overview').then((res) => setData(res.data));
  }, []);

  const teams = data?.teams || [];
  const fixtures = data?.fixtures || [];
  const training = data?.training || [];

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={1}>
        Welcome, {firstName}
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Your teams, fixtures and training at a glance.
      </Typography>

      {/* My teams */}
      <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
        <GroupsIcon color="primary" />
        <Typography variant="h6" fontWeight={700}>
          My Teams
        </Typography>
      </Stack>
      <Grid container spacing={2} mb={3}>
        {teams.length === 0 && (
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">
              You are not assigned to any team yet. Ask your club admin to assign you as a coach.
            </Typography>
          </Grid>
        )}
        {teams.map((t) => (
          <Grid item xs={12} sm={6} md={4} key={t.id}>
            <Card sx={{ height: '100%' }}>
              <CardActionArea onClick={() => navigate(`/teams`)} sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={700} noWrap>
                    {t.name}
                  </Typography>
                  <Stack direction="row" spacing={1} mt={1}>
                    <Chip size="small" label={t.ageGroup} />
                    <Chip size="small" variant="outlined" label={t.category} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                    {t.playerCount} player{t.playerCount === 1 ? '' : 's'}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Performance overview (clickable bars -> team overview) */}
      <Box mb={3}>
        <CoachPerformancePanel />
      </Box>

      <Grid container spacing={2}>
        {/* Upcoming fixtures */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <SportsSoccerIcon color="primary" />
                  <Typography variant="h6" fontWeight={700}>
                    Fixtures
                  </Typography>
                </Stack>
                <Button size="small" onClick={() => navigate('/matches')}>
                  All fixtures
                </Button>
              </Stack>
              <Divider sx={{ mb: 1 }} />
              {fixtures.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No upcoming fixtures for your teams.
                </Typography>
              ) : (
                <List dense disablePadding>
                  {fixtures.map((m) => (
                    <ListItem
                      key={m.id}
                      disableGutters
                      secondaryAction={
                        m.status === 'LIVE' ? (
                          <Button
                            size="small"
                            color="error"
                            startIcon={<PlayArrowIcon />}
                            onClick={() => navigate(`/matches/${m.id}/live`)}
                          >
                            Live
                          </Button>
                        ) : (
                          <Button size="small" onClick={() => navigate(`/matches/${m.id}/live`)}>
                            Open
                          </Button>
                        )
                      }
                    >
                      <ListItemText
                        primary={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2" fontWeight={600} noWrap>
                              {m.homeTeamName} vs {m.awayTeamName}
                            </Typography>
                            <Chip
                              size="small"
                              label={m.status}
                              color={statusColor[m.status]}
                              variant={m.status === 'SCHEDULED' ? 'outlined' : 'filled'}
                            />
                          </Stack>
                        }
                        secondary={`${fmtDateTime(m.scheduledAt)}${m.venue ? ' · ' + m.venue : ''}`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Upcoming training */}
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <FitnessCenterIcon color="primary" />
                  <Typography variant="h6" fontWeight={700}>
                    Training
                  </Typography>
                </Stack>
                <Button size="small" onClick={() => navigate('/training')}>
                  Manage
                </Button>
              </Stack>
              <Divider sx={{ mb: 1 }} />
              {training.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No upcoming sessions.{' '}
                  <Button size="small" onClick={() => navigate('/training')}>
                    Schedule one
                  </Button>
                </Typography>
              ) : (
                <List dense disablePadding>
                  {training.map((s) => (
                    <ListItem
                      key={s.id}
                      disableGutters
                      button
                      onClick={() => navigate('/training')}
                    >
                      <ListItemText
                        primary={
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {s.title}
                          </Typography>
                        }
                        secondary={`${s.teamName} · ${fmtDateTime(s.scheduledAt)}${
                          s.location ? ' · ' + s.location : ''
                        }`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

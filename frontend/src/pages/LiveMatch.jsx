import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  Stack,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import StyleIcon from '@mui/icons-material/Style';
import SportsIcon from '@mui/icons-material/Sports';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import FlagIcon from '@mui/icons-material/Flag';
import { api } from '../api/client.js';
import { getSocket, connectSocket } from '../api/socket.js';

// Big, touch-friendly event buttons for a coach on the field.
const EVENT_BUTTONS = [
  { type: 'GOAL', label: 'Goal', icon: <SportsSoccerIcon />, color: 'primary' },
  { type: 'SHOT', label: 'Shot', icon: <SportsSoccerIcon />, color: 'inherit' },
  { type: 'ASSIST', label: 'Assist', icon: <SwapHorizIcon />, color: 'inherit' },
  { type: 'FOUL', label: 'Foul', icon: <SportsIcon />, color: 'inherit' },
  { type: 'CORNER', label: 'Corner', icon: <FlagIcon />, color: 'inherit' },
  { type: 'YELLOW_CARD', label: 'Yellow', icon: <StyleIcon />, color: 'warning' },
  { type: 'RED_CARD', label: 'Red', icon: <StyleIcon />, color: 'error' },
  { type: 'SUBSTITUTION', label: 'Sub', icon: <SwapHorizIcon />, color: 'inherit' },
];

export default function LiveMatch() {
  const { id: matchId } = useParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [match, setMatch] = useState(null);
  const [events, setEvents] = useState([]);
  const [players, setPlayers] = useState([]);
  const [scoreboard, setScoreboard] = useState({ homeScore: 0, awayScore: 0 });
  const [side, setSide] = useState('home'); // which team the event is for
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingType, setPendingType] = useState(null);

  // --- Initial load ---
  const loadData = useCallback(async () => {
    const [m, ev] = await Promise.all([
      api.get(`/matches/${matchId}`),
      api.get(`/matches/${matchId}/events`),
    ]);
    setMatch(m.data);
    setEvents(ev.data);
    setScoreboard({ homeScore: m.data.homeScore, awayScore: m.data.awayScore });
  }, [matchId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load roster for the currently selected side.
  useEffect(() => {
    if (!match) return;
    const teamId = side === 'home' ? match.homeTeamId : match.awayTeamId;
    api.get(`/players?teamId=${teamId}`).then((res) => setPlayers(res.data));
  }, [match, side]);

  // --- Real-time wiring ---
  useEffect(() => {
    const socket = connectSocket() || getSocket();
    socket.emit('match:join', matchId);

    const onEvent = (evt) => setEvents((prev) => [...prev, evt]);
    const onScore = (sb) =>
      setScoreboard({ homeScore: sb.homeScore, awayScore: sb.awayScore });
    const onStatus = (s) =>
      setMatch((prev) => (prev ? { ...prev, status: s.status } : prev));
    const onDeleted = ({ eventId }) =>
      setEvents((prev) => prev.filter((e) => e.id !== eventId));

    socket.on('match:event', onEvent);
    socket.on('match:scoreboard', onScore);
    socket.on('match:status', onStatus);
    socket.on('match:event:deleted', onDeleted);

    return () => {
      socket.emit('match:leave', matchId);
      socket.off('match:event', onEvent);
      socket.off('match:scoreboard', onScore);
      socket.off('match:status', onStatus);
      socket.off('match:event:deleted', onDeleted);
    };
  }, [matchId]);

  const handleEventClick = (type) => {
    setPendingType(type);
    setPickerOpen(true);
  };

  const submitEvent = async (player) => {
    setPickerOpen(false);
    const teamId = side === 'home' ? match.homeTeamId : match.awayTeamId;
    try {
      await api.post(`/matches/${matchId}/events`, {
        teamId,
        eventType: pendingType,
        playerId: player?.id,
      });
      // No optimistic insert needed — the socket broadcast updates state.
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(err.response?.data?.error || 'Failed to log event');
    } finally {
      setPendingType(null);
    }
  };

  const setStatus = async (status) => {
    const { data } = await api.patch(`/matches/${matchId}/status`, { status });
    setMatch(data);
  };

  if (!match) return <Typography>Loading match…</Typography>;

  return (
    <Box>
      {/* Scoreboard */}
      <Card sx={{ mb: 2, bgcolor: 'primary.main', color: '#fff' }}>
        <CardContent>
          <Grid container alignItems="center" textAlign="center">
            <Grid item xs={4}>
              <Typography variant={isMobile ? 'body1' : 'h6'} noWrap>
                {match.homeTeamName}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="h3" fontWeight={800}>
                {scoreboard.homeScore} - {scoreboard.awayScore}
              </Typography>
              <Chip
                label={match.status}
                size="small"
                sx={{ bgcolor: '#fff', color: 'primary.main', fontWeight: 700 }}
              />
            </Grid>
            <Grid item xs={4}>
              <Typography variant={isMobile ? 'body1' : 'h6'} noWrap>
                {match.awayTeamName}
              </Typography>
            </Grid>
          </Grid>

          <Stack direction="row" justifyContent="center" spacing={1} mt={2}>
            {match.status === 'SCHEDULED' && (
              <Button size="small" sx={{ bgcolor: '#fff', color: 'primary.main' }} onClick={() => setStatus('LIVE')}>
                Kick Off
              </Button>
            )}
            {match.status === 'LIVE' && (
              <Button size="small" color="error" onClick={() => setStatus('FINISHED')}>
                End Match
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        {/* Event controls */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Log Event</Typography>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={side}
                  onChange={(_e, v) => v && setSide(v)}
                >
                  <ToggleButton value="home">{match.homeTeamName}</ToggleButton>
                  <ToggleButton value="away">{match.awayTeamName}</ToggleButton>
                </ToggleButtonGroup>
              </Stack>

              <Grid container spacing={1.5}>
                {EVENT_BUTTONS.map((btn) => (
                  <Grid item xs={6} sm={3} key={btn.type}>
                    <Button
                      fullWidth
                      size="large"
                      color={btn.color}
                      variant={btn.color === 'inherit' ? 'outlined' : 'contained'}
                      startIcon={btn.icon}
                      disabled={match.status !== 'LIVE'}
                      onClick={() => handleEventClick(btn.type)}
                      sx={{ height: 72 }}
                    >
                      {btn.label}
                    </Button>
                  </Grid>
                ))}
              </Grid>
              {match.status !== 'LIVE' && (
                <Typography variant="caption" color="text.secondary" mt={1} display="block">
                  Kick off the match to start logging events.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Real-time timeline */}
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Live Timeline
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <List dense sx={{ maxHeight: 380, overflow: 'auto' }}>
                {events.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No events yet.
                  </Typography>
                )}
                {[...events].reverse().map((e) => (
                  <ListItemText
                    key={e.id}
                    sx={{ py: 0.5 }}
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label={e.eventType.replace('_', ' ')} size="small" color="primary" />
                        <Typography variant="body2">
                          {e.minute != null ? `${e.minute}'` : ''} {e.playerName || ''}
                        </Typography>
                      </Stack>
                    }
                  />
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Player selection modal */}
      <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>
          Select player — {pendingType?.replace('_', ' ')}
        </DialogTitle>
        <DialogContent dividers>
          <List>
            {pendingType !== 'CORNER' && (
              <ListItemButton onClick={() => submitEvent(null)}>
                <ListItemText primary="No specific player / team event" />
              </ListItemButton>
            )}
            {players.map((p) => (
              <ListItemButton key={p.id} onClick={() => submitEvent(p)}>
                <ListItemText
                  primary={`${p.firstName} ${p.lastName}`}
                  secondary={p.jerseyNumber != null ? `#${p.jerseyNumber} · ${p.position || ''}` : p.position}
                />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

import { useEffect, useState, useCallback, useRef } from 'react';
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
  DialogActions,
  TextField,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  Stack,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  LinearProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import StyleIcon from '@mui/icons-material/Style';
import SportsIcon from '@mui/icons-material/Sports';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import FlagIcon from '@mui/icons-material/Flag';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import PanToolIcon from '@mui/icons-material/PanTool';
import ShieldIcon from '@mui/icons-material/Shield';
import BlockIcon from '@mui/icons-material/Block';
import OndemandVideoIcon from '@mui/icons-material/OndemandVideo';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import { api } from '../api/client.js';
import { getSocket, connectSocket } from '../api/socket.js';
import { useAuth } from '../context/AuthContext.jsx';
import MatchVideoPlayer from '../components/MatchVideoPlayer.jsx';
import LineupView from '../components/LineupView.jsx';
import LineupDialog from '../components/LineupDialog.jsx';

// Format seconds as m:ss for the video timeline.
const fmtClock = (s) => {
  if (s == null) return '';
  const m = Math.floor(s / 60);
  const sec = String(s % 60).padStart(2, '0');
  return `${m}:${sec}`;
};

// Big, touch-friendly event buttons for a coach on the field.
const EVENT_BUTTONS = [
  { type: 'GOAL', label: 'Goal', icon: <SportsSoccerIcon />, color: 'primary' },
  { type: 'PENALTY_GOAL', label: 'Penalty', icon: <SportsSoccerIcon />, color: 'primary' },
  { type: 'OWN_GOAL', label: 'Own Goal', icon: <BlockIcon />, color: 'error' },
  { type: 'ASSIST', label: 'Assist', icon: <SwapHorizIcon />, color: 'inherit' },
  { type: 'SHOT', label: 'Shot', icon: <SportsSoccerIcon />, color: 'inherit' },
  { type: 'SHOT_ON_TARGET', label: 'On Target', icon: <GpsFixedIcon />, color: 'inherit' },
  { type: 'SAVE', label: 'Save', icon: <PanToolIcon />, color: 'inherit' },
  { type: 'TACKLE', label: 'Tackle', icon: <ShieldIcon />, color: 'inherit' },
  { type: 'INTERCEPTION', label: 'Intercept', icon: <ShieldIcon />, color: 'inherit' },
  { type: 'OFFSIDE', label: 'Offside', icon: <FlagIcon />, color: 'inherit' },
  { type: 'FOUL', label: 'Foul', icon: <SportsIcon />, color: 'inherit' },
  { type: 'CORNER', label: 'Corner', icon: <FlagIcon />, color: 'inherit' },
  { type: 'YELLOW_CARD', label: 'Yellow', icon: <StyleIcon />, color: 'warning' },
  { type: 'RED_CARD', label: 'Red', icon: <StyleIcon />, color: 'error' },
  { type: 'SUBSTITUTION', label: 'Sub', icon: <SwapHorizIcon />, color: 'inherit' },
];

export default function LiveMatch() {
  const { id: matchId } = useParams();
  const { user } = useAuth();
  const canEditLineup = user?.role === 'COACH';
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [match, setMatch] = useState(null);
  const [events, setEvents] = useState([]);
  const [players, setPlayers] = useState([]);
  const [scoreboard, setScoreboard] = useState({ homeScore: 0, awayScore: 0 });
  const [side, setSide] = useState('home'); // which team the event is for
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingType, setPendingType] = useState(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoInput, setVideoInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [lineup, setLineup] = useState(null);
  const [lineupOpen, setLineupOpen] = useState(false);
  const playerRef = useRef(null);
  const fileInputRef = useRef(null);

  // --- Initial load ---
  const loadData = useCallback(async () => {
    const [m, ev, lu] = await Promise.all([
      api.get(`/matches/${matchId}`),
      api.get(`/matches/${matchId}/events`),
      api.get(`/matches/${matchId}/lineup`),
    ]);
    setMatch(m.data);
    setEvents(ev.data);
    setLineup(lu.data);
    setScoreboard({ homeScore: m.data.homeScore, awayScore: m.data.awayScore });
    setVideoInput(m.data.videoUrl || '');
    // Default the tagging side to whichever side is our internal team.
    if (m.data.homeIsExternal && !m.data.awayIsExternal) setSide('away');
    else setSide('home');
  }, [matchId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load roster for the currently selected side (external opponents have no roster).
  useEffect(() => {
    if (!match) return;
    const isExternal = side === 'home' ? match.homeIsExternal : match.awayIsExternal;
    const teamId = side === 'home' ? match.homeTeamId : match.awayTeamId;
    if (isExternal || !teamId) {
      setPlayers([]);
      return;
    }
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
    // CORNER is a team-level event with no specific player — log it directly.
    if (type === 'CORNER') {
      submitEvent(null, type);
      return;
    }
    setPendingType(type);
    setPickerOpen(true);
  };

  const submitEvent = async (player, typeOverride) => {
    setPickerOpen(false);
    const eventType = typeOverride ?? pendingType;
    const teamId = side === 'home' ? match.homeTeamId : match.awayTeamId;
    // Stamp the current video position so the event can be replayed later.
    const videoSeconds = match.videoUrl ? playerRef.current?.getCurrentTime?.() : undefined;
    try {
      await api.post(`/matches/${matchId}/events`, {
        teamId,
        eventType,
        playerId: player?.id,
        videoSeconds,
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

  const saveVideo = async () => {
    try {
      const { data } = await api.patch(`/matches/${matchId}`, {
        videoUrl: videoInput.trim(),
      });
      setMatch(data);
      setVideoOpen(false);
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(err.response?.data?.error || 'Could not save the video link');
    }
  };

  const uploadFile = async (file) => {
    if (!file) return;
    const form = new FormData();
    form.append('video', file);
    setUploading(true);
    setUploadPct(0);
    try {
      const { data } = await api.post(`/matches/${matchId}/video`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setUploadPct(Math.round((e.loaded / e.total) * 100));
        },
      });
      setMatch(data);
      setVideoOpen(false);
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(err.response?.data?.error || 'Could not upload the video');
    } finally {
      setUploading(false);
      setUploadPct(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const seekToEvent = (seconds) => {
    if (seconds == null) return;
    playerRef.current?.seekTo?.(seconds);
  };

  if (!match) return <Typography>Loading match…</Typography>;

  // Tag live, or review-tag a finished match from its video footage.
  const canTag = match.status === 'LIVE' || (match.status === 'FINISHED' && !!match.videoUrl);

  // Lineup is shown for whichever side is our internal team.
  const lineupTeamId = !match.homeIsExternal
    ? match.homeTeamId
    : !match.awayIsExternal
      ? match.awayTeamId
      : null;
  const lineupTeamName = lineupTeamId === match.homeTeamId ? match.homeTeamName : match.awayTeamName;
  const lineupFormation =
    (lineupTeamId === match.homeTeamId ? match.homeFormation : match.awayFormation) || '4-4-2';
  const myLineup = (lineup?.lineup || []).filter((l) => l.teamId === lineupTeamId);
  const lineupStarters = myLineup.filter((l) => l.isStarting);
  const lineupSubs = myLineup.filter((l) => !l.isStarting);

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
        {/* Video-assisted tagging panel */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h6">Match Video</Typography>
                <Button
                  size="small"
                  startIcon={<OndemandVideoIcon />}
                  onClick={() => {
                    setVideoInput(match.videoUrl?.startsWith('/uploads') ? '' : match.videoUrl || '');
                    setVideoOpen(true);
                  }}
                >
                  {match.videoUrl ? 'Change video' : 'Add video'}
                </Button>
              </Stack>
              <MatchVideoPlayer ref={playerRef} src={match.videoUrl} />
              {match.videoUrl && (
                <Typography variant="caption" color="text.secondary" mt={1} display="block">
                  Tag an event while the video plays — the current timestamp is saved so you
                  can jump back to the moment from the timeline.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Lineup / formation */}
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h6">Lineup</Typography>
                {canEditLineup && (
                  <Button
                    size="small"
                    startIcon={<FormatListNumberedIcon />}
                    onClick={() => setLineupOpen(true)}
                    disabled={!lineupTeamId}
                  >
                    {lineupStarters.length ? 'Edit lineup' : 'Set lineup'}
                  </Button>
                )}
              </Stack>
              {lineupStarters.length ? (
                <LineupView
                  formation={lineupFormation}
                  teamName={lineupTeamName}
                  starters={lineupStarters}
                  subs={lineupSubs}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {!lineupTeamId
                    ? 'Lineups are only available for your internal team.'
                    : canEditLineup
                      ? 'No lineup set yet. Choose a formation and starting XI.'
                      : 'The coach has not set the lineup for this match yet.'}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

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
                  <ToggleButton value="home" disabled={match.homeIsExternal}>
                    {match.homeTeamName}
                  </ToggleButton>
                  <ToggleButton value="away" disabled={match.awayIsExternal}>
                    {match.awayTeamName}
                  </ToggleButton>
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
                      disabled={!canTag}
                      onClick={() => handleEventClick(btn.type)}
                      sx={{ height: 72 }}
                    >
                      {btn.label}
                    </Button>
                  </Grid>
                ))}
              </Grid>
              {!canTag && (
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
                  <ListItemButton
                    key={e.id}
                    sx={{ py: 0.5, borderRadius: 1 }}
                    disabled={e.videoSeconds == null || !match.videoUrl}
                    onClick={() => seekToEvent(e.videoSeconds)}
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip label={e.eventType.replace(/_/g, ' ')} size="small" color="primary" />
                          <Typography variant="body2">
                            {e.minute != null ? `${e.minute}'` : ''} {e.playerName || ''}
                          </Typography>
                          {e.videoSeconds != null && (
                            <Chip
                              label={fmtClock(e.videoSeconds)}
                              size="small"
                              variant="outlined"
                              icon={<OndemandVideoIcon sx={{ fontSize: 14 }} />}
                            />
                          )}
                        </Stack>
                      }
                    />
                  </ListItemButton>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Player selection modal */}
      <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>
          Select player — {pendingType?.replace(/_/g, ' ')}
        </DialogTitle>
        <DialogContent dividers>
          <List>
            <ListItemButton onClick={() => submitEvent(null)}>
              <ListItemText primary="No specific player / team event" />
            </ListItemButton>
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

      {/* Video link / upload dialog */}
      <Dialog open={videoOpen} onClose={() => !uploading && setVideoOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Match video</DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle2" gutterBottom>
            Paste a YouTube link
          </Typography>
          <TextField
            fullWidth
            label="YouTube URL"
            placeholder="https://www.youtube.com/watch?v=…"
            value={videoInput}
            onChange={(e) => setVideoInput(e.target.value)}
            disabled={uploading}
          />
          <Button
            variant="contained"
            sx={{ mt: 1 }}
            onClick={saveVideo}
            disabled={uploading || !videoInput.trim()}
          >
            Save link
          </Button>

          <Divider sx={{ my: 2 }}>OR</Divider>

          <Typography variant="subtitle2" gutterBottom>
            Upload a video from this device
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
            mp4, webm, mov or mkv — up to 1 GB.
          </Typography>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/ogg"
            style={{ display: 'none' }}
            onChange={(e) => uploadFile(e.target.files?.[0])}
          />
          <Button
            variant="outlined"
            startIcon={<OndemandVideoIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            Choose file
          </Button>
          {uploading && (
            <Box mt={2}>
              <LinearProgress variant="determinate" value={uploadPct} />
              <Typography variant="caption" color="text.secondary">
                Uploading… {uploadPct}%
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVideoOpen(false)} disabled={uploading}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lineup editor (coach only) */}
      {lineupTeamId && canEditLineup && (
        <LineupDialog
          open={lineupOpen}
          onClose={() => setLineupOpen(false)}
          matchId={matchId}
          teamId={lineupTeamId}
          teamName={lineupTeamName}
          onSaved={loadData}
        />
      )}
    </Box>
  );
}

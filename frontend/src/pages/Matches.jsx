import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Stack,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ScoreboardIcon from '@mui/icons-material/Scoreboard';
import EventIcon from '@mui/icons-material/Event';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const statusColor = { SCHEDULED: 'default', LIVE: 'error', FINISHED: 'primary' };

const emptyForm = { homeTeamId: '', awayTeamId: '', venue: '', scheduledAt: '' };

// Format an ISO date into a value the datetime-local input understands.
const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
};

export default function Matches() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = user?.role !== 'SYSTEM_ADMIN' && user?.role !== 'GUARDIAN';

  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [tab, setTab] = useState(0);
  const [teamFilter, setTeamFilter] = useState('');

  // Create / reschedule dialog.
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);

  // Record score dialog.
  const [scoreOpen, setScoreOpen] = useState(false);
  const [scoreMatch, setScoreMatch] = useState(null);
  const [score, setScore] = useState({ homeScore: 0, awayScore: 0 });

  const load = () => api.get('/matches').then((res) => setMatches(res.data));
  useEffect(() => {
    load();
    api.get('/teams').then((res) => setTeams(res.data));
  }, []);

  const filtered = useMemo(() => {
    let list = matches;
    if (teamFilter) {
      list = list.filter(
        (m) => m.homeTeamId === teamFilter || m.awayTeamId === teamFilter
      );
    }
    const buckets = { upcoming: [], live: [], results: [] };
    for (const m of list) {
      if (m.status === 'LIVE') buckets.live.push(m);
      else if (m.status === 'FINISHED') buckets.results.push(m);
      else buckets.upcoming.push(m);
    }
    buckets.upcoming.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
    buckets.results.sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));
    return buckets;
  }, [matches, teamFilter]);

  const tabsData = [
    { label: `Upcoming (${filtered.upcoming.length})`, list: filtered.upcoming },
    { label: `Live (${filtered.live.length})`, list: filtered.live },
    { label: `Results (${filtered.results.length})`, list: filtered.results },
  ];
  const currentList = tabsData[tab].list;

  // --- create / reschedule ---
  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openReschedule = (m) => {
    setEditId(m.id);
    setForm({
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      venue: m.venue || '',
      scheduledAt: toLocalInput(m.scheduledAt),
    });
    setOpen(true);
  };

  const handleSave = async () => {
    const scheduledAt = new Date(form.scheduledAt).toISOString();
    if (editId) {
      await api.patch(`/matches/${editId}`, { venue: form.venue, scheduledAt });
    } else {
      await api.post('/matches', {
        homeTeamId: form.homeTeamId,
        awayTeamId: form.awayTeamId,
        venue: form.venue,
        scheduledAt,
      });
    }
    setOpen(false);
    setForm(emptyForm);
    setEditId(null);
    load();
  };

  // --- record score ---
  const openScore = (m) => {
    setScoreMatch(m);
    setScore({ homeScore: m.homeScore ?? 0, awayScore: m.awayScore ?? 0 });
    setScoreOpen(true);
  };

  const handleSaveScore = async () => {
    await api.patch(`/matches/${scoreMatch.id}`, {
      homeScore: Number(score.homeScore),
      awayScore: Number(score.awayScore),
    });
    // Ensure the match is marked finished when a final score is recorded.
    if (scoreMatch.status !== 'FINISHED') {
      await api.patch(`/matches/${scoreMatch.id}/status`, { status: 'FINISHED' });
    }
    setScoreOpen(false);
    setScoreMatch(null);
    load();
  };

  const setStatus = async (m, status) => {
    await api.patch(`/matches/${m.id}/status`, { status });
    load();
  };

  const handleDelete = async (m) => {
    if (!window.confirm(`Delete fixture ${m.homeTeamName} vs ${m.awayTeamName}?`)) return;
    await api.delete(`/matches/${m.id}`);
    load();
  };

  const MatchCard = ({ m }) => {
    const kickoff = new Date(m.scheduledAt);
    const isResult = m.status === 'FINISHED';
    return (
      <Card
        sx={{
          height: '100%',
          transition: 'box-shadow 140ms ease, border-color 140ms ease',
          '&:hover': { boxShadow: '0 4px 16px rgba(16,24,40,0.08)', borderColor: 'primary.light' },
        }}
      >
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Chip
              label={m.status}
              color={statusColor[m.status]}
              size="small"
              variant={m.status === 'SCHEDULED' ? 'outlined' : 'filled'}
            />
            <Typography variant="caption" color="text.secondary">
              {kickoff.toLocaleDateString(undefined, {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}{' '}
              · {kickoff.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </Typography>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1, textAlign: 'right' }} noWrap>
              {m.homeTeamName}
            </Typography>
            <Box
              sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: 1.5,
                bgcolor: isResult || m.status === 'LIVE' ? 'primary.main' : 'background.default',
                color: isResult || m.status === 'LIVE' ? '#fff' : 'text.secondary',
                fontWeight: 700,
                minWidth: 56,
                textAlign: 'center',
              }}
            >
              {isResult || m.status === 'LIVE' ? `${m.homeScore} - ${m.awayScore}` : 'vs'}
            </Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }} noWrap>
              {m.awayTeamName}
            </Typography>
          </Stack>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {m.venue || 'Venue TBD'}
          </Typography>

          <Divider sx={{ my: 1.5 }} />

          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap alignItems="center">
            {m.status === 'SCHEDULED' && canManage && (
              <Button size="small" startIcon={<PlayArrowIcon />} onClick={() => setStatus(m, 'LIVE')}>
                Kick Off
              </Button>
            )}
            {m.status === 'LIVE' && (
              <Button
                size="small"
                color="error"
                startIcon={<PlayArrowIcon />}
                onClick={() => navigate(`/matches/${m.id}/live`)}
              >
                Live Screen
              </Button>
            )}
            {canManage && m.status !== 'SCHEDULED' && (
              <Button size="small" variant="text" startIcon={<ScoreboardIcon />} onClick={() => openScore(m)}>
                {isResult ? 'Edit Score' : 'Record Score'}
              </Button>
            )}
            <Box sx={{ flex: 1 }} />
            {canManage && m.status === 'SCHEDULED' && (
              <IconButton size="small" onClick={() => openReschedule(m)} title="Reschedule">
                <EditIcon fontSize="small" />
              </IconButton>
            )}
            {canManage && (
              <IconButton size="small" color="error" onClick={() => handleDelete(m)} title="Delete">
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Fixtures
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Schedule matches, kick them off live, and record results.
          </Typography>
        </Box>
        {canManage && (
          <Button startIcon={<AddIcon />} onClick={openCreate}>
            New Fixture
          </Button>
        )}
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} mb={2}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ flex: 1 }}>
          {tabsData.map((t) => (
            <Tab key={t.label} label={t.label} />
          ))}
        </Tabs>
        <TextField
          select
          size="small"
          label="Filter by team"
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All teams</MenuItem>
          {teams.map((t) => (
            <MenuItem key={t.id} value={t.id}>
              {t.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {currentList.length === 0 ? (
        <Stack alignItems="center" spacing={1} sx={{ py: 8, color: 'text.secondary' }}>
          <EventIcon sx={{ fontSize: 48, opacity: 0.4 }} />
          <Typography variant="body2">
            No {tabsData[tab].label.split(' ')[0].toLowerCase()} fixtures.
          </Typography>
          {tab === 0 && canManage && (
            <Button startIcon={<AddIcon />} onClick={openCreate} sx={{ mt: 1 }}>
              Schedule one
            </Button>
          )}
        </Stack>
      ) : (
        <Grid container spacing={2}>
          {currentList.map((m) => (
            <Grid item xs={12} sm={6} md={4} key={m.id}>
              <MatchCard m={m} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create / reschedule dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{editId ? 'Reschedule Fixture' : 'New Fixture'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              select
              label="Home team"
              value={form.homeTeamId}
              onChange={(e) => setForm({ ...form, homeTeamId: e.target.value })}
              fullWidth
              disabled={Boolean(editId)}
            >
              {teams.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Away team"
              value={form.awayTeamId}
              onChange={(e) => setForm({ ...form, awayTeamId: e.target.value })}
              fullWidth
              disabled={Boolean(editId)}
            >
              {teams
                .filter((t) => t.id !== form.homeTeamId)
                .map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name}
                  </MenuItem>
                ))}
            </TextField>
            <TextField
              label="Venue"
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
              fullWidth
            />
            <TextField
              label="Kick-off"
              type="datetime-local"
              InputLabelProps={{ shrink: true }}
              value={form.scheduledAt}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!form.homeTeamId || !form.awayTeamId || !form.scheduledAt}
          >
            {editId ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Record score dialog */}
      <Dialog open={scoreOpen} onClose={() => setScoreOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Record Result</DialogTitle>
        <DialogContent>
          {scoreMatch && (
            <Stack spacing={2} mt={1}>
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
                <Stack alignItems="center" spacing={1}>
                  <Typography variant="body2" fontWeight={600} textAlign="center">
                    {scoreMatch.homeTeamName}
                  </Typography>
                  <TextField
                    type="number"
                    value={score.homeScore}
                    onChange={(e) => setScore({ ...score, homeScore: e.target.value })}
                    inputProps={{ min: 0, style: { textAlign: 'center', width: 56 } }}
                  />
                </Stack>
                <Typography variant="h6" color="text.secondary">
                  -
                </Typography>
                <Stack alignItems="center" spacing={1}>
                  <Typography variant="body2" fontWeight={600} textAlign="center">
                    {scoreMatch.awayTeamName}
                  </Typography>
                  <TextField
                    type="number"
                    value={score.awayScore}
                    onChange={(e) => setScore({ ...score, awayScore: e.target.value })}
                    inputProps={{ min: 0, style: { textAlign: 'center', width: 56 } }}
                  />
                </Stack>
              </Stack>
              <Typography variant="caption" color="text.secondary" textAlign="center">
                Saving will mark this fixture as finished.
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setScoreOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveScore}>Save Result</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

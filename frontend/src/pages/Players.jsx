import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Avatar,
  ToggleButton,
  ToggleButtonGroup,
  InputAdornment,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import PlayerCard from '../components/PlayerCard.jsx';

export default function Players() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = user?.role !== 'SYSTEM_ADMIN' && user?.role !== 'GUARDIAN';
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('cards');
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('ALL');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    teamId: '',
    position: '',
    jerseyNumber: '',
    photoUrl: '',
  });

  // Read an uploaded image file as a base64 data URL stored directly in the DB.
  const handlePhotoUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, photoUrl: reader.result }));
    reader.readAsDataURL(file);
  };

  const load = () => api.get('/players').then((res) => setPlayers(res.data));
  useEffect(() => {
    load();
    api.get('/teams').then((res) => setTeams(res.data));
  }, []);

  const handleCreate = async () => {
    const payload = { ...form };
    if (!payload.teamId) delete payload.teamId;
    if (!payload.jerseyNumber) delete payload.jerseyNumber;
    if (!payload.photoUrl) delete payload.photoUrl;
    await api.post('/players', payload);
    setOpen(false);
    setForm({ firstName: '', lastName: '', teamId: '', position: '', jerseyNumber: '', photoUrl: '' });
    load();
  };

  const teamName = (id) => teams.find((t) => t.id === id)?.name || 'Unassigned';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return players.filter((p) => {
      if (teamFilter !== 'ALL' && p.teamId !== teamFilter) return false;
      if (!q) return true;
      return `${p.firstName} ${p.lastName}`.toLowerCase().includes(q);
    });
  }, [players, search, teamFilter]);

  // Group filtered players by team for tidy sections.
  const grouped = useMemo(() => {
    const map = new Map();
    for (const p of filtered) {
      const key = p.teamId || 'unassigned';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    }
    return [...map.entries()].map(([key, list]) => ({
      teamId: key === 'unassigned' ? null : key,
      name: key === 'unassigned' ? 'Unassigned' : teamName(key),
      players: list,
    }));
  }, [filtered, teams]);

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={1.5}
        mb={2.5}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Players
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {filtered.length} player{filtered.length === 1 ? '' : 's'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <TextField
            size="small"
            placeholder="Search players"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 200 }}
          />
          <TextField
            size="small"
            select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="ALL">All teams</MenuItem>
            {teams.map((t) => (
              <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
            ))}
          </TextField>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={view}
            onChange={(e, v) => v && setView(v)}
          >
            <ToggleButton value="cards"><ViewModuleIcon fontSize="small" /></ToggleButton>
            <ToggleButton value="list"><ViewListIcon fontSize="small" /></ToggleButton>
          </ToggleButtonGroup>
          {canManage && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
              Register Player
            </Button>
          )}
        </Stack>
      </Stack>

      {filtered.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" textAlign="center" py={4}>
              No players found.
            </Typography>
          </CardContent>
        </Card>
      ) : view === 'cards' ? (
        <Stack spacing={3}>
          {grouped.map((group) => (
            <Box key={group.teamId || 'unassigned'}>
              <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                <Typography variant="subtitle1" fontWeight={700}>
                  {group.name}
                </Typography>
                <Chip size="small" label={group.players.length} />
              </Stack>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: 2,
                }}
              >
                {group.players.map((p) => (
                  <PlayerCard
                    key={p.id}
                    player={p}
                    width={200}
                    onClick={() => navigate(`/players/${p.id}`)}
                  />
                ))}
              </Box>
            </Box>
          ))}
        </Stack>
      ) : (
        <Card>
          <CardContent sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Player</TableCell>
                  <TableCell>Team</TableCell>
                  <TableCell>Position</TableCell>
                  <TableCell>#</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow
                    key={p.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/players/${p.id}`)}
                  >
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar
                          src={p.photoUrl || undefined}
                          sx={{ width: 28, height: 28, bgcolor: 'primary.main' }}
                        >
                          {p.firstName[0]}
                        </Avatar>
                        {p.firstName} {p.lastName}
                      </Stack>
                    </TableCell>
                    <TableCell>{teamName(p.teamId)}</TableCell>
                    <TableCell>{p.position || '—'}</TableCell>
                    <TableCell>{p.jerseyNumber ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Register Player</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} fullWidth />
            <TextField label="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} fullWidth />
            <TextField select label="Team" value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })} fullWidth>
              <MenuItem value="">Unassigned</MenuItem>
              {teams.map((t) => (
                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
              ))}
            </TextField>
            <TextField label="Position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} fullWidth />
            <TextField label="Jersey number" type="number" value={form.jerseyNumber} onChange={(e) => setForm({ ...form, jerseyNumber: e.target.value })} fullWidth />
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar src={form.photoUrl || undefined} sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
                {form.firstName?.[0] || '?'}
              </Avatar>
              <Button component="label" variant="outlined" size="small">
                Upload photo
                <input
                  hidden
                  accept="image/*"
                  type="file"
                  onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
                />
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!form.firstName || !form.lastName}>Register</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

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
  Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import PlayerCard from '../components/PlayerCard.jsx';
import {
  ageGroupShort,
  contractLabel,
  contractColor,
  POSITION_OPTIONS,
  positionLabel,
  availableJerseyNumbers,
} from '../utils/football.js';

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
    idNumber: '',
    email: '',
    dateOfBirth: '',
    teamId: '',
    position: '',
    jerseyNumber: '',
    photoUrl: '',
    contractStart: '',
    contractEnd: '',
    guardianFirstName: '',
    guardianLastName: '',
    guardianEmail: '',
    guardianPhone: '',
    guardianRelationship: '',
  });

  const emptyForm = {
    firstName: '',
    lastName: '',
    idNumber: '',
    email: '',
    dateOfBirth: '',
    teamId: '',
    position: '',
    jerseyNumber: '',
    photoUrl: '',
    contractStart: '',
    contractEnd: '',
    guardianFirstName: '',
    guardianLastName: '',
    guardianEmail: '',
    guardianPhone: '',
    guardianRelationship: '',
  };

  // Work out the player's age from the entered date of birth. Under 18 makes
  // the guardian section mandatory — exactly how a club registers a minor.
  const playerAge = useMemo(() => {
    if (!form.dateOfBirth) return null;
    const dob = new Date(form.dateOfBirth);
    if (Number.isNaN(dob.getTime())) return null;
    return Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  }, [form.dateOfBirth]);
  const isMinor = playerAge != null && playerAge < 18;

  // Jersey numbers already used in the selected team — so the picker only ever
  // offers shirts that are still free for that team.
  const jerseyOptions = useMemo(() => {
    if (!form.teamId) return availableJerseyNumbers([]);
    const taken = players
      .filter((p) => p.teamId === form.teamId)
      .map((p) => p.jerseyNumber)
      .filter((n) => n != null);
    return availableJerseyNumbers(taken);
  }, [players, form.teamId]);

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
    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      idNumber: form.idNumber,
      email: form.email,
    };
    if (form.teamId) payload.teamId = form.teamId;
    if (form.position) payload.position = form.position;
    if (form.jerseyNumber) payload.jerseyNumber = form.jerseyNumber;
    if (form.photoUrl) payload.photoUrl = form.photoUrl;
    if (form.dateOfBirth) payload.dateOfBirth = form.dateOfBirth;
    if (form.contractStart) payload.contractStart = form.contractStart;
    if (form.contractEnd) payload.contractEnd = form.contractEnd;
    if (isMinor) {
      payload.guardian = {
        firstName: form.guardianFirstName,
        lastName: form.guardianLastName,
        email: form.guardianEmail,
        phone: form.guardianPhone || undefined,
        relationship: form.guardianRelationship || undefined,
      };
    }
    await api.post('/players', payload);
    setOpen(false);
    setForm(emptyForm);
    load();
  };

  // The guardian block is only required once we know the player is a minor.
  const guardianComplete =
    !isMinor ||
    (form.guardianFirstName && form.guardianLastName && form.guardianEmail);

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
          <Autocomplete
            freeSolo
            size="small"
            options={players.map((p) => `${p.firstName} ${p.lastName}`)}
            inputValue={search}
            onInputChange={(e, v) => setSearch(v)}
            sx={{ minWidth: 220 }}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search players"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                      {params.InputProps.startAdornment}
                    </>
                  ),
                }}
              />
            )}
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
                  <TableCell>Age group</TableCell>
                  <TableCell>Position</TableCell>
                  <TableCell>#</TableCell>
                  <TableCell>Contract</TableCell>
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
                    <TableCell>
                      {p.ageGroup ? (
                        <Chip size="small" variant="outlined" label={ageGroupShort(p.ageGroup)} />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {p.position ? (
                        <Chip size="small" variant="outlined" label={p.position} title={positionLabel(p.position)} />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>{p.jerseyNumber ?? '—'}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Chip
                          size="small"
                          label={contractLabel(p.contract)}
                          sx={{
                            bgcolor: contractColor(p.contract).bg,
                            color: contractColor(p.contract).fg,
                            fontWeight: 700,
                          }}
                        />
                        {p.contractRenewals > 0 && (
                          <Chip
                            size="small"
                            variant="outlined"
                            color="success"
                            label={
                              p.contractRenewals > 1
                                ? `Renewed ×${p.contractRenewals}`
                                : 'Renewed'
                            }
                          />
                        )}
                      </Stack>
                    </TableCell>
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
            <TextField label="ID number" value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })} fullWidth required />
            <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} fullWidth required />
            <TextField
              label="Date of birth"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
              InputLabelProps={{ shrink: true }}
              helperText={
                playerAge != null
                  ? isMinor
                    ? `Age ${playerAge} — a guardian is required`
                    : `Age ${playerAge}`
                  : ' '
              }
              fullWidth
            />
            <TextField
              select
              label="Team"
              value={form.teamId}
              onChange={(e) =>
                setForm({ ...form, teamId: e.target.value, jerseyNumber: '' })
              }
              fullWidth
            >
              <MenuItem value="">Unassigned</MenuItem>
              {teams.map((t) => (
                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Position"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              fullWidth
            >
              <MenuItem value="">Not set</MenuItem>
              {POSITION_OPTIONS.map((p) => (
                <MenuItem key={p.value} value={p.value}>
                  {p.value} — {p.label}
                </MenuItem>
              ))}
            </TextField>
            <Autocomplete
              options={jerseyOptions}
              getOptionLabel={(o) => String(o)}
              value={form.jerseyNumber === '' ? null : Number(form.jerseyNumber)}
              onChange={(e, v) => setForm({ ...form, jerseyNumber: v ?? '' })}
              isOptionEqualToValue={(o, v) => Number(o) === Number(v)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Jersey number"
                  helperText={
                    form.teamId
                      ? `${jerseyOptions.length} number${jerseyOptions.length === 1 ? '' : 's'} available for this team`
                      : 'Pick a team to see available numbers'
                  }
                />
              )}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              Contract
            </Typography>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Signed"
                type="date"
                value={form.contractStart}
                onChange={(e) => setForm({ ...form, contractStart: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="Expires"
                type="date"
                value={form.contractEnd}
                onChange={(e) => setForm({ ...form, contractEnd: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>
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

            {isMinor && (
              <>
                <Box
                  sx={{
                    mt: 1,
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'warning.50',
                    border: '1px solid',
                    borderColor: 'warning.light',
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Guardian details (required)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    This player is under 18, so a parent or guardian must be added.
                    They can sign in using the player's ID number to follow their
                    child's stats.
                  </Typography>
                </Box>
                <Stack direction="row" spacing={2}>
                  <TextField label="Guardian first name" value={form.guardianFirstName} onChange={(e) => setForm({ ...form, guardianFirstName: e.target.value })} fullWidth />
                  <TextField label="Guardian last name" value={form.guardianLastName} onChange={(e) => setForm({ ...form, guardianLastName: e.target.value })} fullWidth />
                </Stack>
                <TextField label="Guardian email" type="email" value={form.guardianEmail} onChange={(e) => setForm({ ...form, guardianEmail: e.target.value })} fullWidth />
                <Stack direction="row" spacing={2}>
                  <TextField label="Guardian phone" value={form.guardianPhone} onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })} fullWidth />
                  <TextField select label="Relationship" value={form.guardianRelationship} onChange={(e) => setForm({ ...form, guardianRelationship: e.target.value })} fullWidth>
                    <MenuItem value="">—</MenuItem>
                    <MenuItem value="Parent">Parent</MenuItem>
                    <MenuItem value="Mother">Mother</MenuItem>
                    <MenuItem value="Father">Father</MenuItem>
                    <MenuItem value="Grandparent">Grandparent</MenuItem>
                    <MenuItem value="Sibling">Sibling</MenuItem>
                    <MenuItem value="Guardian">Legal guardian</MenuItem>
                  </TextField>
                </Stack>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreate}
            disabled={
              !form.firstName ||
              !form.lastName ||
              !form.idNumber ||
              !form.email ||
              !guardianComplete
            }
          >
            Register
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

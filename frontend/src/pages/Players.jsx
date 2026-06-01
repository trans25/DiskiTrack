import { useEffect, useState } from 'react';
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
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Avatar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Players() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = user?.role !== 'SYSTEM_ADMIN' && user?.role !== 'GUARDIAN';
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    teamId: '',
    position: '',
    jerseyNumber: '',
  });

  const load = () => api.get('/players').then((res) => setPlayers(res.data));
  useEffect(() => {
    load();
    api.get('/teams').then((res) => setTeams(res.data));
  }, []);

  const handleCreate = async () => {
    const payload = { ...form };
    if (!payload.teamId) delete payload.teamId;
    if (!payload.jerseyNumber) delete payload.jerseyNumber;
    await api.post('/players', payload);
    setOpen(false);
    setForm({ firstName: '', lastName: '', teamId: '', position: '', jerseyNumber: '' });
    load();
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={700}>
          Players
        </Typography>
        {canManage && (
          <Button startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            Register Player
          </Button>
        )}
      </Stack>

      <Card>
        <CardContent sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Player</TableCell>
                <TableCell>Position</TableCell>
                <TableCell>#</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {players.map((p) => (
                <TableRow
                  key={p.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/players/${p.id}`)}
                >
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main' }}>
                        {p.firstName[0]}
                      </Avatar>
                      {p.firstName} {p.lastName}
                    </Stack>
                  </TableCell>
                  <TableCell>{p.position || '—'}</TableCell>
                  <TableCell>{p.jerseyNumber ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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

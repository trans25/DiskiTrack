import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Tabs,
  Tab,
  Avatar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const ROLE_COLORS = {
  CLUB_ADMIN: 'primary',
  COACH: 'success',
  ANALYST: 'warning',
  GUARDIAN: 'default',
};

export default function ClubUsers() {
  const { user } = useAuth();
  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
  const canManage = user?.role === 'CLUB_ADMIN';
  const [tab, setTab] = useState(0);
  const [users, setUsers] = useState([]);
  const [players, setPlayers] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'COACH',
  });

  const loadUsers = () => api.get('/users').then((res) => setUsers(res.data));
  const loadPlayers = () => api.get('/players').then((res) => setPlayers(res.data));

  useEffect(() => {
    loadUsers();
    if (!isSystemAdmin) loadPlayers();
  }, [isSystemAdmin]);

  const handleCreate = async () => {
    setError('');
    try {
      await api.post('/users', form);
      setOpen(false);
      setForm({ firstName: '', lastName: '', email: '', password: '', role: 'COACH' });
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
    }
  };

  // SYSTEM_ADMIN does not belong to a tenant, so they only see club admins.
  const clubAdmins = users.filter((x) => x.role === 'CLUB_ADMIN');

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={700}>
          {isSystemAdmin ? 'Club Admins' : 'Club Members'}
        </Typography>
        {canManage && tab === 0 && (
          <Button startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            Add User
          </Button>
        )}
      </Stack>

      {/* SYSTEM_ADMIN: club admins only (no tenant membership) */}
      {isSystemAdmin && (
        <Card>
          <CardContent sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clubAdmins.map((x) => (
                  <TableRow key={x.id} hover>
                    <TableCell>
                      {x.firstName} {x.lastName}
                    </TableCell>
                    <TableCell>{x.email}</TableCell>
                    <TableCell>{x.isActive ? 'Active' : 'Inactive'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!isSystemAdmin && (
        <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label={`Staff (${users.filter((x) => x.role !== 'GUARDIAN').length})`} />
          <Tab label={`Guardians (${users.filter((x) => x.role === 'GUARDIAN').length})`} />
          <Tab label={`Players (${players.length})`} />
        </Tabs>
      )}

      {/* Staff */}
      {!isSystemAdmin && tab === 0 && (
        <Card>
          <CardContent sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users
                  .filter((x) => x.role !== 'GUARDIAN')
                  .map((x) => (
                    <TableRow key={x.id} hover>
                      <TableCell>
                        {x.firstName} {x.lastName}
                      </TableCell>
                      <TableCell>{x.email}</TableCell>
                      <TableCell>
                        <Chip label={x.role.replace('_', ' ')} color={ROLE_COLORS[x.role]} size="small" />
                      </TableCell>
                      <TableCell>{x.isActive ? 'Active' : 'Inactive'}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Guardians */}
      {!isSystemAdmin && tab === 1 && (
        <Card>
          <CardContent sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users
                  .filter((x) => x.role === 'GUARDIAN')
                  .map((x) => (
                    <TableRow key={x.id} hover>
                      <TableCell>
                        {x.firstName} {x.lastName}
                      </TableCell>
                      <TableCell>{x.email}</TableCell>
                      <TableCell>{x.isActive ? 'Active' : 'Inactive'}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Players */}
      {!isSystemAdmin && tab === 2 && (
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
                  <TableRow key={p.id} hover>
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
      )}

      {/* Add user dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add Club User</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {error && (
              <Typography variant="body2" color="error">
                {error}
              </Typography>
            )}
            <TextField label="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} fullWidth />
            <TextField label="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} fullWidth />
            <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} fullWidth />
            <TextField label="Temporary password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} fullWidth />
            <TextField select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} fullWidth>
              <MenuItem value="CLUB_ADMIN">Club Admin</MenuItem>
              <MenuItem value="COACH">Coach</MenuItem>
              <MenuItem value="ANALYST">Analyst</MenuItem>
              <MenuItem value="GUARDIAN">Guardian</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!form.firstName || !form.lastName || !form.email || form.password.length < 6}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

import { useEffect, useMemo, useState } from 'react';
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
  Alert,
  Snackbar,
  Autocomplete,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
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
  const [toast, setToast] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'COACH',
  });

  const loadUsers = () => api.get('/users').then((res) => setUsers(res.data));
  const loadPlayers = () => api.get('/players').then((res) => setPlayers(res.data));

  useEffect(() => {
    loadUsers();
    if (!isSystemAdmin) loadPlayers();
  }, [isSystemAdmin]);

  const handleInvite = async () => {
    setError('');
    setInviteLink('');
    try {
      const { data } = await api.post('/users/invite', form);
      setOpen(false);
      setForm({ firstName: '', lastName: '', email: '', role: 'COACH' });
      loadUsers();
      if (data.emailDelivered) {
        setToast(`Invitation email sent to ${data.email}`);
      } else if (data.inviteLink) {
        // Dev / no-SMTP: surface the link so the admin can share it manually.
        setInviteLink(data.inviteLink);
      } else {
        setToast('User invited');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to invite user');
    }
  };

  const handleResend = async (id) => {
    try {
      const { data } = await api.post(`/users/${id}/resend-invite`);
      if (data.emailDelivered) {
        setToast('Invitation re-sent');
      } else if (data.inviteLink) {
        setInviteLink(data.inviteLink);
      }
    } catch (err) {
      setToast(err.response?.data?.error || 'Failed to resend invite');
    }
  };

  // SYSTEM_ADMIN does not belong to a tenant, so they only see club admins.
  const clubAdmins = users.filter((x) => x.role === 'CLUB_ADMIN');

  // Shared text search across the current listing.
  const q = search.trim().toLowerCase();
  const matchUser = (x) =>
    !q ||
    `${x.firstName} ${x.lastName}`.toLowerCase().includes(q) ||
    (x.email || '').toLowerCase().includes(q);
  const matchPlayer = (p) =>
    !q ||
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
    (p.position || '').toLowerCase().includes(q);

  const filteredClubAdmins = clubAdmins.filter(matchUser);
  const filteredStaff = users.filter((x) => x.role !== 'GUARDIAN').filter(matchUser);
  const filteredGuardians = users.filter((x) => x.role === 'GUARDIAN').filter(matchUser);
  const filteredPlayers = players.filter(matchPlayer);

  // Autocomplete suggestions based on the active tab.
  const searchOptions = useMemo(() => {
    const names = new Set();
    if (isSystemAdmin) {
      clubAdmins.forEach((x) => names.add(`${x.firstName} ${x.lastName}`));
    } else if (tab === 2) {
      players.forEach((p) => names.add(`${p.firstName} ${p.lastName}`));
    } else {
      users.forEach((x) => names.add(`${x.firstName} ${x.lastName}`));
    }
    return Array.from(names);
  }, [users, players, clubAdmins, tab, isSystemAdmin]);

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={1.5}
        mb={2}
      >
        <Typography variant="h5" fontWeight={700}>
          {isSystemAdmin ? 'Club Admins' : 'Club Members'}
        </Typography>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Autocomplete
            freeSolo
            size="small"
            options={searchOptions}
            inputValue={search}
            onInputChange={(e, v) => setSearch(v)}
            sx={{ minWidth: 220 }}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search members"
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
          {canManage && tab === 0 && (
            <Button startIcon={<AddIcon />} onClick={() => setOpen(true)}>
              Invite User
            </Button>
          )}
        </Stack>
      </Stack>

      {inviteLink && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setInviteLink('')}>
          Email isn&apos;t configured, so share this activation link with the member:
          <br />
          <Box component="code" sx={{ wordBreak: 'break-all', fontSize: 13 }}>
            {inviteLink}
          </Box>
        </Alert>
      )}

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
                {filteredClubAdmins.map((x) => (
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
                {filteredStaff
                  .map((x) => (
                    <TableRow key={x.id} hover>
                      <TableCell>
                        {x.firstName} {x.lastName}
                      </TableCell>
                      <TableCell>{x.email}</TableCell>
                      <TableCell>
                        <Chip label={x.role.replace('_', ' ')} color={ROLE_COLORS[x.role]} size="small" />
                      </TableCell>
                      <TableCell>
                        {x.isActive ? (
                          <Chip label="Active" color="success" size="small" variant="outlined" />
                        ) : (
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip label="Pending" color="warning" size="small" variant="outlined" />
                            {canManage && (
                              <Button size="small" onClick={() => handleResend(x.id)}>
                                Resend
                              </Button>
                            )}
                          </Stack>
                        )}
                      </TableCell>
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
                {filteredGuardians
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
                {filteredPlayers.map((p) => (
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

      {/* Invite user dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Invite Club User</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {error && (
              <Typography variant="body2" color="error">
                {error}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              We&apos;ll email them a secure link to set their own password and
              activate their account.
            </Typography>
            <TextField label="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} fullWidth />
            <TextField label="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} fullWidth />
            <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} fullWidth />
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
            onClick={handleInvite}
            disabled={!form.firstName || !form.lastName || !form.email}
          >
            Send invite
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast('')}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}

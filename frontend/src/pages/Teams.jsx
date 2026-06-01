import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  Chip,
  IconButton,
  Divider,
  Avatar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ApartmentIcon from '@mui/icons-material/Apartment';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import TeamOverviewDialog from '../components/TeamOverviewDialog.jsx';

const AGE_GROUPS = ['U13', 'U14', 'U15', 'U16', 'U17', 'U19', 'SENIOR'];
const CATEGORIES = ['BOYS', 'GIRLS', 'MEN', 'WOMEN'];

const emptyForm = { id: null, name: '', ageGroup: 'U13', category: 'BOYS', clubId: '' };

export default function Teams() {
  const { user } = useAuth();
  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
  // Club Admins manage teams day-to-day; System Admin only manages clubs.
  const canManageTeams = user?.role === 'CLUB_ADMIN';
  const canManageClubs = isSystemAdmin;

  const [teams, setTeams] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  // Club create/edit (SYSTEM_ADMIN only). New clubs also bootstrap a Club Admin.
  const [clubOpen, setClubOpen] = useState(false);
  const emptyClub = {
    id: null,
    name: '',
    country: '',
    city: '',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: '',
  };
  const [clubForm, setClubForm] = useState(emptyClub);
  const [clubError, setClubError] = useState('');

  // Club detail view (list of teams within a club).
  const [detailClubId, setDetailClubId] = useState(null);

  // Team overview (roster, staff, form, stats).
  const [overviewTeamId, setOverviewTeamId] = useState(null);

  const loadClubs = () => api.get('/clubs').then((res) => setClubs(res.data));
  const load = () => api.get('/teams').then((res) => setTeams(res.data));
  useEffect(() => {
    load();
    if (isSystemAdmin) {
      loadClubs();
    }
  }, [isSystemAdmin]);

  // Group teams by club so each club gets its own card.
  const groups = useMemo(() => {
    const map = new Map();
    for (const t of teams) {
      const key = t.clubId || 'unknown';
      if (!map.has(key)) {
        map.set(key, { clubId: key, clubName: t.clubName || 'Unassigned', teams: [] });
      }
      map.get(key).teams.push(t);
    }
    return Array.from(map.values());
  }, [teams]);

  const detailClub = useMemo(
    () => groups.find((g) => g.clubId === detailClubId) || null,
    [groups, detailClubId]
  );

  const openCreate = () => {
    setForm({ ...emptyForm, clubId: isSystemAdmin ? '' : '' });
    setOpen(true);
  };

  const openEdit = (t) => {
    setForm({
      id: t.id,
      name: t.name,
      ageGroup: t.ageGroup,
      category: t.category,
      clubId: t.clubId || '',
    });
    setOpen(true);
  };

  // Club Admins manage teams within their own club (tenant from their JWT).
  const handleSave = async () => {
    const payload = { name: form.name, ageGroup: form.ageGroup, category: form.category };
    if (form.id) {
      await api.patch(`/teams/${form.id}`, payload);
    } else {
      await api.post('/teams', payload);
    }
    setOpen(false);
    setForm(emptyForm);
    load();
  };

  const handleDelete = async (t) => {
    if (!window.confirm(`Delete team "${t.name}"?`)) return;
    await api.delete(`/teams/${t.id}`);
    load();
  };

  // --- Club create / edit ---
  const openClubCreate = () => {
    setClubError('');
    setClubForm(emptyClub);
    setClubOpen(true);
  };

  // Deleting a club cascades to its teams, users, players, matches and stats.
  const handleDeleteClub = async (group) => {
    if (
      !window.confirm(
        `Delete club "${group.clubName}"?\n\nThis permanently removes all its teams, players, staff and matches.`
      )
    )
      return;
    await api.delete(`/clubs/${group.clubId}`);
    await Promise.all([loadClubs(), load()]);
  };

  const openClubEdit = (group) => {
    const club = clubs.find((c) => c.id === group.clubId);
    setClubError('');
    setClubForm({
      ...emptyClub,
      id: group.clubId,
      name: club?.name ?? group.clubName,
      country: club?.country ?? '',
      city: club?.city ?? '',
    });
    setClubOpen(true);
  };

  const slugify = (name) =>
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const handleSaveClub = async () => {
    setClubError('');
    try {
      if (clubForm.id) {
        await api.patch(`/clubs/${clubForm.id}`, {
          name: clubForm.name,
          country: clubForm.country || undefined,
          city: clubForm.city || undefined,
        });
        await Promise.all([loadClubs(), load()]);
        setClubOpen(false);
      } else {
        const payload = {
          name: clubForm.name,
          slug: slugify(clubForm.name),
          country: clubForm.country || undefined,
          city: clubForm.city || undefined,
        };
        // Bootstrap the club's first Club Admin if details were provided.
        if (clubForm.adminEmail && clubForm.adminPassword) {
          payload.admin = {
            email: clubForm.adminEmail,
            password: clubForm.adminPassword,
            firstName: clubForm.adminFirstName || 'Club',
            lastName: clubForm.adminLastName || 'Admin',
          };
        }
        await api.post('/clubs', payload);
        await Promise.all([loadClubs(), load()]);
        setClubOpen(false);
      }
    } catch (err) {
      setClubError(err.response?.data?.error || 'Failed to save club');
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Teams
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {canManageClubs ? 'Manage clubs and their first administrators.' : 'Manage the teams in your club.'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          {canManageClubs && (
            <Button variant="contained" startIcon={<ApartmentIcon />} onClick={openClubCreate}>
              New Club
            </Button>
          )}
          {canManageTeams && (
            <Button startIcon={<AddIcon />} onClick={openCreate}>
              New Team
            </Button>
          )}
        </Stack>
      </Stack>

      <Grid container spacing={2}>
        {groups.map((g) => (
          <Grid item xs={6} sm={4} md={3} key={g.clubId}>
            <Card
              sx={{
                height: '100%',
                transition: 'border-color 140ms ease, box-shadow 140ms ease',
                '&:hover': {
                  borderColor: 'primary.light',
                  boxShadow: '0 4px 16px rgba(16,24,40,0.08)',
                },
                '&:hover .club-actions': { opacity: 1 },
              }}
            >
              <CardActionArea onClick={() => setDetailClubId(g.clubId)} sx={{ height: '100%' }}>
                <CardContent sx={{ p: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Avatar
                      variant="rounded"
                      sx={{ bgcolor: 'primary.main', width: 44, height: 44, borderRadius: 2.5 }}
                    >
                      <ApartmentIcon />
                    </Avatar>
                    {canManageClubs && g.clubId !== 'unknown' && (
                      <Stack
                        direction="row"
                        spacing={0.5}
                        className="club-actions"
                        sx={{ opacity: { xs: 1, md: 0 }, transition: 'opacity 140ms ease' }}
                      >
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            openClubEdit(g);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClub(g);
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    )}
                  </Stack>
                  <Typography variant="subtitle1" fontWeight={700} mt={1.5} noWrap title={g.clubName}>
                    {g.clubName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {g.teams.length} team{g.teams.length === 1 ? '' : 's'}
                  </Typography>
                  {g.teams.length > 0 && (
                    <Stack direction="row" spacing={0.75} mt={1.5} flexWrap="wrap" useFlexGap>
                      {g.teams.slice(0, 3).map((t) => (
                        <Chip key={t.id} label={t.ageGroup} color="primary" size="small" />
                      ))}
                      {g.teams.length > 3 && (
                        <Chip label={`+${g.teams.length - 3}`} variant="outlined" size="small" />
                      )}
                    </Stack>
                  )}
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
        {groups.length === 0 && (
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">
              No teams yet.
            </Typography>
          </Grid>
        )}
      </Grid>

      {/* Club detail: teams within the selected club */}
      <Dialog
        open={Boolean(detailClub)}
        onClose={() => setDetailClubId(null)}
        fullWidth
        maxWidth="md"
      >
        {detailClub && (
          <>
            <DialogTitle>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar
                  variant="rounded"
                  sx={{ bgcolor: 'primary.main', width: 40, height: 40, borderRadius: 2.5 }}
                >
                  <ApartmentIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                    {detailClub.clubName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {detailClub.teams.length} team{detailClub.teams.length === 1 ? '' : 's'}
                  </Typography>
                </Box>
              </Stack>
            </DialogTitle>
            <DialogContent dividers>
              {detailClub.teams.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No teams in this club yet.
                </Typography>
              ) : (
                <Grid container spacing={1.5}>
                  {detailClub.teams.map((t) => (
                    <Grid item xs={6} sm={4} md={3} key={t.id}>
                      <Card
                        variant="outlined"
                        sx={{
                          height: '100%',
                          bgcolor: 'background.default',
                          transition: 'border-color 140ms ease, box-shadow 140ms ease',
                          '&:hover': {
                            borderColor: 'primary.light',
                            boxShadow: '0 2px 10px rgba(16,24,40,0.06)',
                          },
                        }}
                      >
                        <CardActionArea onClick={() => setOverviewTeamId(t.id)}>
                          <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                              alignItems="center"
                            >
                              <Typography
                                variant="subtitle2"
                                fontWeight={700}
                                noWrap
                                title={t.name}
                              >
                                {t.name}
                              </Typography>
                              {canManageTeams && (
                                <Stack direction="row" spacing={0.5}>
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEdit(t);
                                    }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(t);
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Stack>
                              )}
                            </Stack>
                            <Stack direction="row" spacing={0.75} mt={1}>
                              <Chip label={t.ageGroup} color="primary" size="small" />
                              <Chip label={t.category} variant="outlined" size="small" />
                            </Stack>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </DialogContent>
            <DialogActions>
              {canManageTeams && (
                <Button startIcon={<AddIcon />} onClick={openCreate}>
                  New Team
                </Button>
              )}
              <Button variant="text" onClick={() => setDetailClubId(null)}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <TeamOverviewDialog
        teamId={overviewTeamId}
        open={Boolean(overviewTeamId)}
        onClose={() => setOverviewTeamId(null)}
      />

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{form.id ? 'Edit Team' : 'Create Team'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Team name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              fullWidth
            />
            <TextField
              select
              label="Age group"
              value={form.ageGroup}
              onChange={(e) => setForm({ ...form, ageGroup: e.target.value })}
              fullWidth
            >
              {AGE_GROUPS.map((a) => (
                <MenuItem key={a} value={a}>
                  {a}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              fullWidth
            >
              {CATEGORIES.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!form.name}>
            {form.id ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create / edit club (tenant) */}
      <Dialog open={clubOpen} onClose={() => setClubOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{clubForm.id ? 'Edit Club' : 'New Club'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {clubError && (
              <Typography variant="body2" color="error">
                {clubError}
              </Typography>
            )}
            <TextField
              label="Club name"
              value={clubForm.name}
              onChange={(e) => setClubForm({ ...clubForm, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Country"
              value={clubForm.country}
              onChange={(e) => setClubForm({ ...clubForm, country: e.target.value })}
              fullWidth
            />
            <TextField
              label="City"
              value={clubForm.city}
              onChange={(e) => setClubForm({ ...clubForm, city: e.target.value })}
              fullWidth
            />
            {!clubForm.id && (
              <>
                <Divider textAlign="left">
                  <Typography variant="caption" color="text.secondary">
                    First Club Admin
                  </Typography>
                </Divider>
                <Stack direction="row" spacing={1}>
                  <TextField
                    label="First name"
                    value={clubForm.adminFirstName}
                    onChange={(e) => setClubForm({ ...clubForm, adminFirstName: e.target.value })}
                    fullWidth
                  />
                  <TextField
                    label="Last name"
                    value={clubForm.adminLastName}
                    onChange={(e) => setClubForm({ ...clubForm, adminLastName: e.target.value })}
                    fullWidth
                  />
                </Stack>
                <TextField
                  label="Admin email"
                  type="email"
                  value={clubForm.adminEmail}
                  onChange={(e) => setClubForm({ ...clubForm, adminEmail: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Temporary password"
                  type="password"
                  value={clubForm.adminPassword}
                  onChange={(e) => setClubForm({ ...clubForm, adminPassword: e.target.value })}
                  fullWidth
                  helperText="The club admin will manage teams, players and staff."
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setClubOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveClub}
            disabled={
              clubForm.name.trim().length < 2 ||
              (!clubForm.id &&
                ((clubForm.adminEmail && clubForm.adminPassword.length < 6) ||
                  (clubForm.adminPassword && !clubForm.adminEmail)))
            }
          >
            {clubForm.id ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

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
  Snackbar,
  Autocomplete,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ApartmentIcon from '@mui/icons-material/Apartment';
import GroupsIcon from '@mui/icons-material/Groups';
import SearchIcon from '@mui/icons-material/Search';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import TeamOverviewDialog from '../components/TeamOverviewDialog.jsx';
import {
  AGE_GROUP_OPTIONS,
  CATEGORY_OPTIONS,
  ageGroupLabel,
  categoryLabel,
  suggestCategory,
  suggestTeamName,
  teamSummary,
} from '../utils/football.js';

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
  // Track whether the admin typed their own name so we stop auto-suggesting.
  const [nameTouched, setNameTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  // Search + filter for the team/club listing.
  const [search, setSearch] = useState('');
  const [ageFilter, setAgeFilter] = useState('ALL');

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
    const q = search.trim().toLowerCase();
    const filteredTeams = teams.filter((t) => {
      if (ageFilter !== 'ALL' && t.ageGroup !== ageFilter) return false;
      if (!q) return true;
      return (
        (t.name || '').toLowerCase().includes(q) ||
        (t.clubName || '').toLowerCase().includes(q)
      );
    });
    const map = new Map();
    for (const t of filteredTeams) {
      const key = t.clubId || 'unknown';
      if (!map.has(key)) {
        map.set(key, {
          clubId: key,
          clubName: t.clubName || 'Unassigned',
          clubLogoUrl: t.clubLogoUrl || null,
          teams: [],
        });
      }
      map.get(key).teams.push(t);
    }
    return Array.from(map.values());
  }, [teams, search, ageFilter]);

  // Distinct age groups present, for the filter dropdown.
  const ageOptions = useMemo(() => {
    const set = new Set(teams.map((t) => t.ageGroup).filter(Boolean));
    return Array.from(set);
  }, [teams]);

  // Name suggestions for the autocomplete search.
  const searchOptions = useMemo(() => {
    const set = new Set();
    for (const t of teams) {
      if (t.name) set.add(t.name);
      if (t.clubName) set.add(t.clubName);
    }
    return Array.from(set);
  }, [teams]);

  const detailClub = useMemo(
    () => groups.find((g) => g.clubId === detailClubId) || null,
    [groups, detailClubId]
  );

  const openCreate = () => {
    setNameTouched(false);
    setForm({
      ...emptyForm,
      name: suggestTeamName(emptyForm.ageGroup, emptyForm.category),
    });
    setOpen(true);
  };

  const openEdit = (t) => {
    setNameTouched(true);
    setForm({
      id: t.id,
      name: t.name,
      ageGroup: t.ageGroup,
      category: t.category,
      clubId: t.clubId || '',
    });
    setOpen(true);
  };

  // When age group changes, keep the category sensible (youth<->senior) and,
  // unless the admin has typed a custom name, refresh the suggested name.
  const handleAgeGroupChange = (ageGroup) => {
    const category = suggestCategory(ageGroup, form.category);
    setForm((f) => ({
      ...f,
      ageGroup,
      category,
      name: nameTouched ? f.name : suggestTeamName(ageGroup, category),
    }));
  };

  const handleCategoryChange = (category) => {
    setForm((f) => ({
      ...f,
      category,
      name: nameTouched ? f.name : suggestTeamName(f.ageGroup, category),
    }));
  };

  const handleNameChange = (name) => {
    setNameTouched(true);
    setForm((f) => ({ ...f, name }));
  };

  // Club Admins manage teams within their own club (tenant from their JWT).
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), ageGroup: form.ageGroup, category: form.category };
      if (form.id) {
        await api.patch(`/teams/${form.id}`, payload);
        setToast(`Team "${payload.name}" updated.`);
      } else {
        await api.post('/teams', payload);
        setToast(`Team "${payload.name}" created.`);
      }
      setOpen(false);
      setForm(emptyForm);
      setNameTouched(false);
      load();
    } catch (err) {
      setToast(err.response?.data?.error || 'Could not save the team. Please try again.');
    } finally {
      setSaving(false);
    }
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
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', md: 'center' }}
        spacing={1.5}
        mb={3}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Teams
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {canManageClubs ? 'Manage clubs and their first administrators.' : 'Manage the teams in your club.'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <Autocomplete
            freeSolo
            size="small"
            options={searchOptions}
            inputValue={search}
            onInputChange={(e, v) => setSearch(v)}
            sx={{ minWidth: 200 }}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search teams or clubs"
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
            value={ageFilter}
            onChange={(e) => setAgeFilter(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="ALL">All age groups</MenuItem>
            {ageOptions.map((a) => (
              <MenuItem key={a} value={a}>{ageGroupLabel(a)}</MenuItem>
            ))}
          </TextField>
          {canManageClubs && (
            <Button variant="contained" startIcon={<ApartmentIcon />} onClick={openClubCreate}>
              New Club
            </Button>
          )}
          {canManageTeams && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
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
                      src={g.clubLogoUrl || undefined}
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
                        <Chip key={t.id} label={ageGroupLabel(t.ageGroup)} color="primary" size="small" />
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
            <Card variant="outlined" sx={{ textAlign: 'center', py: 6, px: 2, borderStyle: 'dashed' }}>
              <GroupsIcon sx={{ fontSize: 48, color: 'primary.light', mb: 1 }} />
              <Typography variant="h6" fontWeight={700}>
                {canManageTeams ? 'Set up your first team' : 'No teams yet'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, mx: 'auto', mt: 0.5 }}>
                {canManageTeams
                  ? 'Create a team for each age group your club runs \u2014 from mini football right up to your senior side.'
                  : 'Teams will appear here once they have been added.'}
              </Typography>
              {canManageTeams && (
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={{ mt: 2.5 }}>
                  New Team
                </Button>
              )}
            </Card>
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
                  src={detailClub.clubLogoUrl || undefined}
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
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                                <Avatar
                                  variant="rounded"
                                  src={t.logoUrl || t.clubLogoUrl || undefined}
                                  sx={{ bgcolor: 'primary.main', width: 28, height: 28, borderRadius: 1.5 }}
                                >
                                  <GroupsIcon sx={{ fontSize: 16 }} />
                                </Avatar>
                                <Typography
                                  variant="subtitle2"
                                  fontWeight={700}
                                  noWrap
                                  title={t.name}
                                >
                                  {t.name}
                                </Typography>
                              </Stack>
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
                              <Chip label={ageGroupLabel(t.ageGroup)} color="primary" size="small" />
                              <Chip label={categoryLabel(t.category)} variant="outlined" size="small" />
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

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pb: 0.5 }}>
          {form.id ? 'Edit team' : 'Create a new team'}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {form.id
              ? 'Update this team\u2019s details.'
              : 'Pick the age group and category. We\u2019ll suggest a name you can keep or change.'}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} mt={2}>
            <TextField
              select
              label="Age group"
              value={form.ageGroup}
              onChange={(e) => handleAgeGroupChange(e.target.value)}
              fullWidth
              helperText="From mini football through to senior and reserve sides."
            >
              {AGE_GROUP_OPTIONS.map((a) => (
                <MenuItem key={a.value} value={a.value}>
                  {a.label}
                </MenuItem>
              ))}
            </TextField>

            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                Category
              </Typography>
              <Grid container spacing={1}>
                {CATEGORY_OPTIONS.map((c) => {
                  const selected = form.category === c.value;
                  return (
                    <Grid item xs={6} sm={3} key={c.value}>
                      <Card
                        variant="outlined"
                        sx={{
                          cursor: 'pointer',
                          textAlign: 'center',
                          py: 1.25,
                          borderColor: selected ? 'primary.main' : 'divider',
                          borderWidth: selected ? 2 : 1,
                          bgcolor: selected ? 'primary.50' : 'background.paper',
                          transition: 'all 120ms ease',
                          '&:hover': { borderColor: 'primary.light' },
                        }}
                        onClick={() => handleCategoryChange(c.value)}
                      >
                        <Typography
                          variant="body2"
                          fontWeight={selected ? 700 : 500}
                          color={selected ? 'primary.main' : 'text.primary'}
                        >
                          {c.label}
                        </Typography>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>

            <TextField
              label="Team name"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              fullWidth
              helperText={
                nameTouched
                  ? 'This is how the team appears across the club.'
                  : 'Suggested for you \u2014 edit it if your club uses a different name.'
              }
            />

            <Box
              sx={{
                borderRadius: 2,
                bgcolor: 'background.default',
                border: '1px dashed',
                borderColor: 'divider',
                p: 1.75,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Preview
              </Typography>
              <Stack direction="row" spacing={1.25} alignItems="center" mt={0.75}>
                <Avatar variant="rounded" sx={{ bgcolor: 'primary.main', width: 36, height: 36, borderRadius: 2 }}>
                  <GroupsIcon sx={{ fontSize: 18 }} />
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" fontWeight={700} noWrap>
                    {form.name || suggestTeamName(form.ageGroup, form.category)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {teamSummary(form.ageGroup, form.category)}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="text" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!form.name.trim() || saving}
          >
            {saving ? 'Saving\u2026' : form.id ? 'Save changes' : 'Create team'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3000}
        onClose={() => setToast('')}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

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

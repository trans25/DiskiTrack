import { useEffect, useState } from 'react';
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
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import AttendanceDialog from '../components/AttendanceDialog.jsx';

const emptyForm = {
  teamId: '',
  title: '',
  location: '',
  focus: '',
  scheduledAt: '',
  durationMin: 90,
};

const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
};

const fmtDateTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString(
    undefined,
    { hour: '2-digit', minute: '2-digit' }
  )}`;
};

export default function Training() {
  const { user } = useAuth();
  const canManage = user?.role === 'COACH' || user?.role === 'CLUB_ADMIN';

  const [sessions, setSessions] = useState([]);
  const [teams, setTeams] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [attendanceSession, setAttendanceSession] = useState(null);

  const load = () => api.get('/training').then((res) => setSessions(res.data));

  useEffect(() => {
    load();
    // Coaches only schedule for their own teams, so source the dropdown from the
    // coach-scoped overview. Club admins manage every team in the club.
    if (user?.role === 'COACH') {
      api.get('/coach/overview').then((res) => setTeams(res.data.teams || []));
    } else {
      api.get('/teams').then((res) => setTeams(res.data));
    }
  }, [user]);

  const teamOptions = teams;

  const openCreate = () => {
    setForm(emptyForm);
    setEditId(null);
    setOpen(true);
  };

  const openEdit = (s) => {
    setForm({
      teamId: s.teamId,
      title: s.title,
      location: s.location || '',
      focus: s.focus || '',
      scheduledAt: toLocalInput(s.scheduledAt),
      durationMin: s.durationMin ?? 90,
    });
    setEditId(s.id);
    setOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      title: form.title,
      location: form.location || undefined,
      focus: form.focus || undefined,
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      durationMin: form.durationMin ? Number(form.durationMin) : undefined,
    };
    try {
      if (editId) {
        await api.patch(`/training/${editId}`, payload);
      } else {
        await api.post('/training', { ...payload, teamId: form.teamId });
      }
      setOpen(false);
      load();
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(err.response?.data?.error || 'Could not save the session');
    }
  };

  const handleDelete = async (s) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete training session "${s.title}"?`)) return;
    await api.delete(`/training/${s.id}`);
    load();
  };

  const canSubmit = form.teamId && form.title.trim() && form.scheduledAt;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Training
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Schedule sessions and track player availability.
          </Typography>
        </Box>
        {canManage && (
          <Button startIcon={<AddIcon />} onClick={openCreate}>
            New Session
          </Button>
        )}
      </Stack>

      {sessions.length === 0 ? (
        <Stack alignItems="center" spacing={1} sx={{ py: 8, color: 'text.secondary' }}>
          <FitnessCenterIcon sx={{ fontSize: 48, opacity: 0.4 }} />
          <Typography variant="body2">No training sessions scheduled.</Typography>
          {canManage && (
            <Button startIcon={<AddIcon />} onClick={openCreate} sx={{ mt: 1 }}>
              Schedule one
            </Button>
          )}
        </Stack>
      ) : (
        <Grid container spacing={2}>
          {sessions.map((s) => {
            const past = new Date(s.scheduledAt) < new Date();
            return (
              <Grid item xs={12} sm={6} md={4} key={s.id}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Chip
                        size="small"
                        label={past ? 'Past' : 'Upcoming'}
                        color={past ? 'default' : 'primary'}
                        variant={past ? 'outlined' : 'filled'}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {s.teamName}
                      </Typography>
                    </Stack>

                    <Typography variant="subtitle1" fontWeight={700} mt={1} noWrap>
                      {s.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {fmtDateTime(s.scheduledAt)}
                      {s.durationMin ? ` · ${s.durationMin} min` : ''}
                    </Typography>
                    {s.location && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {s.location}
                      </Typography>
                    )}
                    {s.focus && (
                      <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                        {s.focus}
                      </Typography>
                    )}

                    <Divider sx={{ my: 1.5 }} />
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Button
                        size="small"
                        startIcon={<HowToRegIcon />}
                        onClick={() => setAttendanceSession(s)}
                      >
                        Attendance
                      </Button>
                      <Box sx={{ flex: 1 }} />
                      {canManage && (
                        <IconButton size="small" onClick={() => openEdit(s)} title="Edit">
                          <EditIcon fontSize="small" />
                        </IconButton>
                      )}
                      {canManage && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(s)}
                          title="Delete"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Create / edit dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editId ? 'Edit Session' : 'New Training Session'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              select
              label="Team"
              value={form.teamId}
              onChange={(e) => setForm({ ...form, teamId: e.target.value })}
              fullWidth
              disabled={Boolean(editId)}
            >
              {teamOptions.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              fullWidth
            />
            <TextField
              label="Date & time"
              type="datetime-local"
              InputLabelProps={{ shrink: true }}
              value={form.scheduledAt}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              fullWidth
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Location"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                fullWidth
              />
              <TextField
                label="Duration (min)"
                type="number"
                value={form.durationMin}
                onChange={(e) => setForm({ ...form, durationMin: e.target.value })}
                sx={{ width: 160 }}
                inputProps={{ min: 0, max: 600 }}
              />
            </Stack>
            <TextField
              label="Focus / notes"
              value={form.focus}
              onChange={(e) => setForm({ ...form, focus: e.target.value })}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSubmit}>
            {editId ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Attendance dialog */}
      <AttendanceDialog
        open={Boolean(attendanceSession)}
        session={attendanceSession}
        canEdit={canManage}
        onClose={() => setAttendanceSession(null)}
        onSaved={load}
      />
    </Box>
  );
}

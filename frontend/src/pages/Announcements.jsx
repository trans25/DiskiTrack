import { useEffect, useState } from 'react';
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
  FormControlLabel,
  Switch,
  Chip,
  IconButton,
  Avatar,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PushPinIcon from '@mui/icons-material/PushPin';
import CampaignIcon from '@mui/icons-material/Campaign';
import GroupsIcon from '@mui/icons-material/Groups';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useAnnouncements } from '../context/AnnouncementsContext.jsx';

const emptyForm = { title: '', body: '', isPinned: false, teamId: '' };

const formatDate = (iso) =>
  new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

export default function Announcements() {
  const { user } = useAuth();
  const { items, markSeen, reload } = useAnnouncements();
  const canManage = user?.role === 'CLUB_ADMIN' || user?.role === 'COACH';
  const [teams, setTeams] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  // Mark the board as read whenever it is open, and clear the unread badge.
  useEffect(() => {
    markSeen();
  }, [markSeen, items.length]);

  useEffect(() => {
    if (canManage) api.get('/teams').then((res) => setTeams(res.data));
  }, [canManage]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (a) => {
    setEditingId(a.id);
    setForm({
      title: a.title,
      body: a.body,
      isPinned: a.isPinned,
      teamId: a.teamId || '',
    });
    setOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      title: form.title,
      body: form.body,
      isPinned: form.isPinned,
      teamId: form.teamId ? form.teamId : null,
    };
    if (editingId) {
      await api.patch(`/announcements/${editingId}`, payload);
    } else {
      await api.post('/announcements', payload);
    }
    setOpen(false);
    setForm(emptyForm);
    setEditingId(null);
    reload();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    await api.delete(`/announcements/${id}`);
    reload();
  };

  const togglePin = async (a) => {
    await api.patch(`/announcements/${a.id}`, { isPinned: !a.isPinned });
    reload();
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <CampaignIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            Announcements
          </Typography>
        </Stack>
        {canManage && (
          <Button startIcon={<AddIcon />} onClick={openCreate}>
            New Notice
          </Button>
        )}
      </Stack>

      {items.length === 0 && (
        <Card>
          <CardContent>
            <Stack alignItems="center" spacing={1} py={4}>
              <CampaignIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
              <Typography color="text.secondary">
                No announcements yet.
              </Typography>
              {canManage && (
                <Button startIcon={<AddIcon />} onClick={openCreate}>
                  Post the first notice
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      <Stack spacing={2}>
        {items.map((a) => (
          <Card
            key={a.id}
            sx={
              a.isPinned
                ? { borderLeft: '4px solid', borderColor: 'primary.main' }
                : undefined
            }
          >
            <CardContent>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
                spacing={1}
              >
                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                  {a.isPinned && (
                    <Chip
                      size="small"
                      color="primary"
                      icon={<PushPinIcon />}
                      label="Pinned"
                    />
                  )}
                  <Chip
                    size="small"
                    variant="outlined"
                    icon={<GroupsIcon />}
                    label={a.teamName || 'Whole club'}
                  />
                  <Typography variant="h6" fontWeight={700}>
                    {a.title}
                  </Typography>
                </Stack>
                {canManage && (
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title={a.isPinned ? 'Unpin' : 'Pin'}>
                      <IconButton
                        size="small"
                        color={a.isPinned ? 'primary' : 'default'}
                        onClick={() => togglePin(a)}
                      >
                        <PushPinIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openEdit(a)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(a.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                )}
              </Stack>

              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mt: 1, whiteSpace: 'pre-wrap' }}
              >
                {a.body}
              </Typography>

              <Stack direction="row" spacing={1} alignItems="center" mt={2}>
                <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main', fontSize: 12 }}>
                  {a.authorName?.[0] ?? 'C'}
                </Avatar>
                <Typography variant="caption" color="text.secondary">
                  {a.authorName} • {formatDate(a.createdAt)}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? 'Edit Notice' : 'New Notice'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              fullWidth
            />
            <TextField
              label="Message"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              fullWidth
              multiline
              minRows={4}
            />
            <TextField
              select
              label="Audience"
              value={form.teamId}
              onChange={(e) => setForm({ ...form, teamId: e.target.value })}
              fullWidth
              helperText="Show to the whole club or just one team."
            >
              <MenuItem value="">Whole club</MenuItem>
              {teams.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name}
                </MenuItem>
              ))}
            </TextField>
            <FormControlLabel
              control={
                <Switch
                  checked={form.isPinned}
                  onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
                />
              }
              label="Pin to top"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!form.title.trim() || !form.body.trim()}
          >
            {editingId ? 'Save' : 'Post'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

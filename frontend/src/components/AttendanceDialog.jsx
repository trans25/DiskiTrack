import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  List,
  ListItem,
  ListItemText,
  ToggleButtonGroup,
  ToggleButton,
  Avatar,
  CircularProgress,
  Box,
  Chip,
} from '@mui/material';
import { api } from '../api/client.js';

const STATUSES = [
  { value: 'PRESENT', label: 'In', color: 'success' },
  { value: 'ABSENT', label: 'Out', color: 'error' },
  { value: 'EXCUSED', label: 'Exc', color: 'warning' },
  { value: 'INJURED', label: 'Inj', color: 'default' },
];

/**
 * Mark each player's availability/attendance for a training session.
 * Read-only when `canEdit` is false (e.g. a non-managing viewer).
 */
export default function AttendanceDialog({ open, session, canEdit, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!open || !session) return;
    let cancelled = false;
    setLoading(true);
    api
      .get(`/training/${session.id}/attendance`)
      .then((res) => {
        if (!cancelled) setRows(res.data.attendance);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, session]);

  const setStatus = (playerId, status) => {
    setRows((prev) => prev.map((r) => (r.playerId === playerId ? { ...r, status } : r)));
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/training/${session.id}/attendance`, {
        entries: rows.map((r) => ({ playerId: r.playerId, status: r.status, note: r.note ?? null })),
      });
      onSaved?.();
      onClose();
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(err.response?.data?.error || 'Could not save attendance');
    } finally {
      setSaving(false);
    }
  };

  const present = rows.filter((r) => r.status === 'PRESENT').length;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Attendance — {session?.title}
        {!loading && (
          <Chip size="small" color="success" label={`${present} in`} sx={{ ml: 1 }} />
        )}
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : rows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No active players on this team.
          </Typography>
        ) : (
          <List dense disablePadding>
            {rows.map((r) => (
              <ListItem key={r.playerId} disableGutters sx={{ flexWrap: 'wrap' }}>
                <Avatar
                  sx={{
                    width: 30,
                    height: 30,
                    mr: 1.5,
                    bgcolor: 'background.default',
                    color: 'primary.main',
                    fontSize: 13,
                    fontWeight: 700,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  {r.jerseyNumber != null ? r.jerseyNumber : (r.lastName || '?')[0]}
                </Avatar>
                <ListItemText
                  primary={`${r.firstName} ${r.lastName}`}
                  secondary={r.position || ''}
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                  sx={{ flex: '1 1 140px' }}
                />
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={r.status}
                  onChange={(_e, v) => v && canEdit && setStatus(r.playerId, v)}
                  disabled={!canEdit}
                >
                  {STATUSES.map((s) => (
                    <ToggleButton key={s.value} value={s.value} sx={{ px: 1.2 }}>
                      {s.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Close
        </Button>
        {canEdit && (
          <Button variant="contained" onClick={save} disabled={saving || loading}>
            Save
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Box,
  Typography,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HelpIcon from '@mui/icons-material/Help';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { api } from '../api/client.js';

const STATUS_META = {
  AVAILABLE: { label: 'Available', color: 'success', icon: <CheckCircleIcon fontSize="small" /> },
  MAYBE: { label: 'Maybe', color: 'warning', icon: <HelpIcon fontSize="small" /> },
  UNAVAILABLE: { label: 'Unavailable', color: 'error', icon: <CancelIcon fontSize="small" /> },
};

const SummaryStat = ({ icon, label, value, color }) => (
  <Box sx={{ textAlign: 'center', flex: 1 }}>
    <Box sx={{ color, display: 'flex', justifyContent: 'center', mb: 0.5 }}>{icon}</Box>
    <Typography variant="h5" fontWeight={800} lineHeight={1}>
      {value}
    </Typography>
    <Typography variant="caption" color="text.secondary" fontWeight={600}>
      {label}
    </Typography>
  </Box>
);

/**
 * Coach / club-admin view of squad availability for a fixture. Shows a summary
 * (available / maybe / unavailable / no reply) and a per-player breakdown so the
 * coach can name the call-up with confidence.
 */
export default function SquadAvailabilityDialog({ open, match, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !match?.id) return;
    let active = true;
    setLoading(true);
    api
      .get(`/matches/${match.id}/availability`)
      .then((res) => active && setData(res.data))
      .catch(() => active && setData(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [open, match?.id]);

  const summary = data?.summary || { available: 0, maybe: 0, unavailable: 0, pending: 0 };
  const players = data?.players || [];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Squad Availability
        {match && (
          <Typography variant="body2" color="text.secondary">
            {match.homeTeamName} vs {match.awayTeamName}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent dividers>
        {loading && <LinearProgress sx={{ mb: 2 }} />}

        <Stack direction="row" spacing={1} mb={1}>
          <SummaryStat
            icon={<CheckCircleIcon />}
            label="Available"
            value={summary.available}
            color="success.main"
          />
          <SummaryStat icon={<HelpIcon />} label="Maybe" value={summary.maybe} color="warning.main" />
          <SummaryStat
            icon={<CancelIcon />}
            label="Out"
            value={summary.unavailable}
            color="error.main"
          />
          <SummaryStat
            icon={<HourglassEmptyIcon />}
            label="No reply"
            value={summary.pending}
            color="text.disabled"
          />
        </Stack>

        <Divider sx={{ my: 1.5 }} />

        {players.length === 0 ? (
          <Typography variant="body2" color="text.secondary" py={2} textAlign="center">
            No squad players found for this fixture.
          </Typography>
        ) : (
          <List dense disablePadding>
            {players.map((p) => {
              const meta = STATUS_META[p.status];
              return (
                <ListItem key={p.playerId} disableGutters
                  secondaryAction={
                    meta ? (
                      <Chip size="small" color={meta.color} icon={meta.icon} label={meta.label} />
                    ) : (
                      <Chip size="small" variant="outlined" label="No reply" />
                    )
                  }
                >
                  <ListItemText
                    primary={`${p.firstName} ${p.lastName}`}
                    secondary={
                      p.jerseyNumber != null
                        ? `#${p.jerseyNumber} · ${p.position || ''}`
                        : p.position || ''
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

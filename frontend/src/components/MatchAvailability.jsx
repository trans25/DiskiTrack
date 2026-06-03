import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
  Button,
  Chip,
  Divider,
} from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HelpIcon from '@mui/icons-material/Help';
import { api } from '../api/client.js';

const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'TBC';

const OPTIONS = [
  { value: 'AVAILABLE', label: 'Available', color: 'success', icon: <CheckCircleIcon fontSize="small" /> },
  { value: 'MAYBE', label: 'Maybe', color: 'warning', icon: <HelpIcon fontSize="small" /> },
  { value: 'UNAVAILABLE', label: 'Unavailable', color: 'error', icon: <CancelIcon fontSize="small" /> },
];

const statusChip = (status) => {
  const opt = OPTIONS.find((o) => o.value === status);
  if (!opt) return <Chip size="small" label="No reply yet" variant="outlined" />;
  return <Chip size="small" color={opt.color} icon={opt.icon} label={opt.label} />;
};

/**
 * Player / guardian RSVP for upcoming fixtures. Lists each upcoming match for
 * the given player and lets them confirm availability.
 *
 * Props:
 *   playerId — restrict the list to a single player's fixtures (optional).
 */
export default function MatchAvailability({ playerId }) {
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(null);

  const load = useCallback(() => {
    api
      .get('/players/me/availability')
      .then((res) => {
        const data = playerId
          ? res.data.filter((r) => r.playerId === playerId)
          : res.data;
        setRows(data);
      })
      .catch(() => setRows([]))
      .finally(() => setLoaded(true));
  }, [playerId]);

  useEffect(() => {
    load();
  }, [load]);

  const respond = async (row, status) => {
    setSaving(`${row.matchId}-${row.playerId}`);
    try {
      await api.put(`/matches/${row.matchId}/availability`, {
        playerId: row.playerId,
        status,
      });
      setRows((prev) =>
        prev.map((r) =>
          r.matchId === row.matchId && r.playerId === row.playerId
            ? { ...r, status }
            : r
        )
      );
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(err.response?.data?.error || 'Failed to save availability');
    } finally {
      setSaving(null);
    }
  };

  if (!loaded) return null;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
          <EventAvailableIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>
            Match Availability
          </Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Let your coach know if you can play upcoming fixtures.
        </Typography>
        <Divider sx={{ my: 1.5 }} />

        {rows.length === 0 ? (
          <Typography variant="body2" color="text.secondary" py={2}>
            No upcoming fixtures to respond to right now.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {rows.map((row) => {
              const busy = saving === `${row.matchId}-${row.playerId}`;
              return (
                <Box
                  key={`${row.matchId}-${row.playerId}`}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    spacing={1}
                  >
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {row.homeTeamName || 'Home'} vs {row.awayTeamName || 'Away'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {fmtDateTime(row.scheduledAt)}
                      </Typography>
                    </Box>
                    {statusChip(row.status)}
                  </Stack>
                  <Stack direction="row" spacing={1} mt={1.5} flexWrap="wrap" useFlexGap>
                    {OPTIONS.map((opt) => (
                      <Button
                        key={opt.value}
                        size="small"
                        disabled={busy}
                        variant={row.status === opt.value ? 'contained' : 'outlined'}
                        color={opt.color}
                        startIcon={opt.icon}
                        onClick={() => respond(row, opt.value)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Box,
  Typography,
  TextField,
  MenuItem,
  List,
  ListItemButton,
  ListItemText,
  Checkbox,
  Chip,
  Divider,
} from '@mui/material';
import { api } from '../api/client.js';
import LineupPitch, { FORMATION_NAMES, formationSlots } from './LineupPitch.jsx';

/**
 * Build the starting XI lineup for one team: choose a formation, pick up to 11
 * starters (ordered to fill the formation), and mark the rest as substitutes.
 */
export default function LineupDialog({ open, onClose, matchId, teamId, teamName, onSaved }) {
  const [formation, setFormation] = useState('4-4-2');
  const [roster, setRoster] = useState([]);
  const [starterIds, setStarterIds] = useState([]); // ordered
  const [subIds, setSubIds] = useState([]);
  const [saving, setSaving] = useState(false);

  const maxStarters = formationSlots(formation).length; // 11

  useEffect(() => {
    if (!open || !teamId) return;
    let cancelled = false;
    (async () => {
      const [playersRes, lineupRes] = await Promise.all([
        api.get(`/players?teamId=${teamId}`),
        api.get(`/matches/${matchId}/lineup`),
      ]);
      if (cancelled) return;
      setRoster(playersRes.data);

      const { homeFormation, awayFormation, homeTeamId, lineup } = lineupRes.data;
      const isHome = teamId === homeTeamId;
      setFormation((isHome ? homeFormation : awayFormation) || '4-4-2');

      const mine = lineup.filter((l) => l.teamId === teamId);
      if (mine.length) {
        setStarterIds(mine.filter((l) => l.isStarting).map((l) => l.playerId));
        setSubIds(mine.filter((l) => !l.isStarting).map((l) => l.playerId));
      } else {
        setStarterIds([]);
        setSubIds([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, teamId, matchId]);

  const byId = useMemo(() => {
    const map = {};
    roster.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [roster]);

  const starters = starterIds.map((id) => byId[id]).filter(Boolean);

  const toggleStarter = (id) => {
    setStarterIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= maxStarters) return prev; // full
      return [...prev, id];
    });
    setSubIds((prev) => prev.filter((x) => x !== id));
  };

  const toggleSub = (id) => {
    setSubIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setStarterIds((prev) => prev.filter((x) => x !== id));
  };

  const save = async () => {
    setSaving(true);
    try {
      const players = [
        ...starterIds.map((id) => ({
          playerId: id,
          isStarting: true,
          jerseyNumber: byId[id]?.jerseyNumber ?? null,
          position: byId[id]?.position ?? null,
        })),
        ...subIds.map((id) => ({
          playerId: id,
          isStarting: false,
          jerseyNumber: byId[id]?.jerseyNumber ?? null,
          position: byId[id]?.position ?? null,
        })),
      ];
      await api.put(`/matches/${matchId}/lineup`, { teamId, formation, players });
      onSaved?.();
      onClose();
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(err.response?.data?.error || 'Could not save the lineup');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Team lineup — {teamName}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12} md={5}>
            <TextField
              select
              fullWidth
              size="small"
              label="Formation"
              value={formation}
              onChange={(e) => setFormation(e.target.value)}
              sx={{ mb: 2 }}
            >
              {FORMATION_NAMES.map((f) => (
                <MenuItem key={f} value={f}>
                  {f}
                </MenuItem>
              ))}
            </TextField>
            <LineupPitch formation={formation} starters={starters} teamName={teamName} />
          </Grid>

          <Grid item xs={12} md={7}>
            <Stack2
              label={`Starting XI (${starterIds.length}/${maxStarters})`}
              hint="Players are placed top-to-bottom into the formation."
            />
            <List dense sx={{ maxHeight: 200, overflow: 'auto', mb: 1 }}>
              {roster.map((p) => {
                const starterIdx = starterIds.indexOf(p.id);
                const isStarter = starterIdx >= 0;
                const isSub = subIds.includes(p.id);
                return (
                  <ListItemButton key={p.id} onClick={() => toggleStarter(p.id)} disabled={!isStarter && starterIds.length >= maxStarters && !isSub}>
                    <Checkbox edge="start" checked={isStarter} tabIndex={-1} disableRipple />
                    <ListItemText
                      primary={
                        <span>
                          {p.jerseyNumber != null ? `#${p.jerseyNumber} ` : ''}
                          {p.firstName} {p.lastName}
                        </span>
                      }
                      secondary={p.position || ''}
                    />
                    {isStarter && <Chip size="small" label={starterIdx + 1} color="primary" sx={{ mr: 1 }} />}
                    <Button
                      size="small"
                      variant={isSub ? 'contained' : 'outlined'}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSub(p.id);
                      }}
                    >
                      Sub
                    </Button>
                  </ListItemButton>
                );
              })}
            </List>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2">Substitutes ({subIds.length})</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
              {subIds.map((id) => (
                <Chip
                  key={id}
                  label={`${byId[id]?.jerseyNumber != null ? '#' + byId[id].jerseyNumber + ' ' : ''}${byId[id]?.lastName || ''}`}
                  onDelete={() => toggleSub(id)}
                  size="small"
                />
              ))}
              {subIds.length === 0 && (
                <Typography variant="caption" color="text.secondary">
                  No substitutes selected.
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={save} disabled={saving || starterIds.length === 0}>
          Save lineup
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Small labelled header used above the selection list.
function Stack2({ label, hint }) {
  return (
    <Box sx={{ mb: 0.5 }}>
      <Typography variant="subtitle2">{label}</Typography>
      <Typography variant="caption" color="text.secondary">
        {hint}
      </Typography>
    </Box>
  );
}

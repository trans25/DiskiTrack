import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
  Box,
} from '@mui/material';
import { api } from '../api/client.js';
import LineupView from './LineupView.jsx';

/**
 * Read-only lineup viewer reachable from the fixtures list. Resolves the
 * internal team's saved starting XI, substitutes and formation for a match.
 */
export default function LineupViewerDialog({ open, onClose, match }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!open || !match) return;
    let cancelled = false;
    setLoading(true);
    setData(null);
    api
      .get(`/matches/${match.id}/lineup`)
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, match]);

  // Lineup is shown for whichever side is our internal team.
  const lineupTeamId = match
    ? !match.homeIsExternal
      ? match.homeTeamId
      : !match.awayIsExternal
        ? match.awayTeamId
        : null
    : null;
  const teamName =
    match && lineupTeamId === match.homeTeamId ? match?.homeTeamName : match?.awayTeamName;
  const formation =
    (lineupTeamId === match?.homeTeamId ? data?.homeFormation : data?.awayFormation) || '4-4-2';
  const mine = (data?.lineup || []).filter((l) => l.teamId === lineupTeamId);
  const starters = mine.filter((l) => l.isStarting);
  const subs = mine.filter((l) => !l.isStarting);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Lineup — {match?.homeTeamName} vs {match?.awayTeamName}
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : !lineupTeamId ? (
          <Typography variant="body2" color="text.secondary">
            Lineups are only available for your internal team.
          </Typography>
        ) : (
          <LineupView formation={formation} teamName={teamName} starters={starters} subs={subs} />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

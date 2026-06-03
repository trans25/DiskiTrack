import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Stack,
  Divider,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import PlayerCard from '../components/PlayerCard.jsx';
import { contractLabel, contractColor } from '../utils/football.js';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const StatBox = ({ label, value }) => (
  <Grid item xs={4} sm={2}>
    <Card>
      <CardContent sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="h5" fontWeight={700} color="primary">
          {value ?? 0}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
      </CardContent>
    </Card>
  </Grid>
);

export default function PlayerProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const canManage = user?.role === 'CLUB_ADMIN';
  const [player, setPlayer] = useState(null);
  const [stats, setStats] = useState(null);
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewForm, setRenewForm] = useState({ contractStart: '', contractEnd: '' });

  const loadPlayer = () => api.get(`/players/${id}`).then((res) => setPlayer(res.data));

  useEffect(() => {
    loadPlayer();
    api.get(`/players/${id}/stats`).then((res) => setStats(res.data));
  }, [id]);

  const handleRenew = async () => {
    const payload = { contractEnd: renewForm.contractEnd };
    if (renewForm.contractStart) payload.contractStart = renewForm.contractStart;
    await api.post(`/players/${id}/renew`, payload);
    setRenewOpen(false);
    setRenewForm({ contractStart: '', contractEnd: '' });
    loadPlayer();
  };

  if (!player) return <Typography>Loading…</Typography>;

  const cc = contractColor(player.contract);

  return (
    <Box>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={3}
            alignItems={{ xs: 'center', sm: 'flex-start' }}
          >
            <PlayerCard player={player} width={200} />
            <Box sx={{ pt: { sm: 2 } }}>
              <Typography variant="h5" fontWeight={700}>
                {player.firstName} {player.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {player.position || 'Position N/A'}
                {player.jerseyNumber != null ? ` · #${player.jerseyNumber}` : ''}
              </Typography>
              {player.teamName && (
                <Typography variant="body2" color="text.secondary">
                  {player.teamName}
                  {player.ageGroup ? ` · ${player.ageGroup}` : ''}
                </Typography>
              )}
              {player.age != null && (
                <Typography variant="body2" color="text.secondary">
                  Age {player.age}
                </Typography>
              )}
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Contract panel */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            spacing={1.5}
          >
            <Box>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Contract
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip
                  label={contractLabel(player.contract)}
                  sx={{ bgcolor: cc.bg, color: cc.fg, fontWeight: 700 }}
                />
                {player.contractRenewals > 0 && (
                  <Chip
                    size="small"
                    color="success"
                    variant="outlined"
                    label={
                      player.contractRenewals > 1
                        ? `Renewed ×${player.contractRenewals}`
                        : 'Renewed'
                    }
                  />
                )}
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Signed {fmtDate(player.contractStart)} · Expires {fmtDate(player.contractEnd)}
              </Typography>
              {player.contractRenewedAt && (
                <Typography variant="caption" color="text.secondary">
                  Last renewed {fmtDate(player.contractRenewedAt)}
                </Typography>
              )}
            </Box>
            {canManage && (
              <Button
                variant="outlined"
                startIcon={<AutorenewIcon />}
                onClick={() => {
                  setRenewForm({
                    contractStart: player.contractEnd || '',
                    contractEnd: '',
                  });
                  setRenewOpen(true);
                }}
              >
                Renew contract
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Typography variant="h6" fontWeight={700} mb={1}>
        Career Stats
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <Grid container spacing={2}>
        <StatBox label="Matches" value={stats?.matches_played} />
        <StatBox label="Goals" value={stats?.goals} />
        <StatBox label="Assists" value={stats?.assists} />
        <StatBox label="Shots" value={stats?.shots} />
        <StatBox label="Fouls" value={stats?.fouls} />
        <StatBox label="Yellow" value={stats?.yellow_cards} />
      </Grid>

      <Dialog open={renewOpen} onClose={() => setRenewOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Renew Contract</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Typography variant="body2" color="text.secondary">
              Record a contract extension for {player.firstName} {player.lastName}.
            </Typography>
            <TextField
              label="New start (optional)"
              type="date"
              value={renewForm.contractStart}
              onChange={(e) => setRenewForm({ ...renewForm, contractStart: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="New expiry"
              type="date"
              value={renewForm.contractEnd}
              onChange={(e) => setRenewForm({ ...renewForm, contractEnd: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setRenewOpen(false)}>Cancel</Button>
          <Button onClick={handleRenew} disabled={!renewForm.contractEnd}>Confirm renewal</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

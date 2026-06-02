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
} from '@mui/material';
import { api } from '../api/client.js';
import PlayerCard from '../components/PlayerCard.jsx';

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
  const [player, setPlayer] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get(`/players/${id}`).then((res) => setPlayer(res.data));
    api.get(`/players/${id}/stats`).then((res) => setStats(res.data));
  }, [id]);

  if (!player) return <Typography>Loading…</Typography>;

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
    </Box>
  );
}

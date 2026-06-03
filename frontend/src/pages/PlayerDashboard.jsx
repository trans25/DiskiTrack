import { useEffect, useState } from 'react';
import { Box, Typography, Alert, Stack, CircularProgress } from '@mui/material';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useAnnouncements } from '../context/AnnouncementsContext.jsx';
import PinnedAnnouncements from '../components/PinnedAnnouncements.jsx';
import PlayerHub from '../components/PlayerHub.jsx';

// Self-service dashboard for a logged-in PLAYER. Shows ONLY their own linked
// player record, stats, contract and matches — never club-wide data.
export default function PlayerDashboard() {
  const { user } = useAuth();
  const { items: announcements } = useAnnouncements();
  const [player, setPlayer] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/players/me')
      .then((res) => setPlayer(res.data))
      .catch((err) =>
        setError(
          err.response?.data?.error ||
            'We could not find a player profile linked to your account yet.'
        )
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={0.5}>
        Hi {user?.firstName} 👋
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Here is your personal player hub.
      </Typography>

      <PinnedAnnouncements announcements={announcements} />

      {loading ? (
        <Stack alignItems="center" py={6}>
          <CircularProgress />
        </Stack>
      ) : error ? (
        <Alert severity="info">{error}</Alert>
      ) : (
        <PlayerHub player={player} />
      )}
    </Box>
  );
}

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Alert,
  Stack,
  CircularProgress,
  Avatar,
  Chip,
} from '@mui/material';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useAnnouncements } from '../context/AnnouncementsContext.jsx';
import PinnedAnnouncements from '../components/PinnedAnnouncements.jsx';
import PlayerHub from '../components/PlayerHub.jsx';

// Map a raw guardian player row (snake_case from the guardian endpoint) into
// the shape PlayerHub / PlayerCard expect.
const toHubPlayer = (r) => ({
  id: r.id,
  firstName: r.first_name,
  lastName: r.last_name,
  position: r.position,
  jerseyNumber: r.jersey_number,
  photoUrl: r.photo_url,
  clubLogoUrl: r.club_logo_url ?? null,
  teamName: r.team_name ?? null,
  ageGroup: r.age_group ?? null,
  dateOfBirth: r.date_of_birth,
  contractStart: r.contract_start ?? null,
  contractEnd: r.contract_end ?? null,
  contractRenewals: r.contract_renewals ?? 0,
});

// Guardian dashboard — shows only the children linked to this guardian. When a
// guardian has more than one child, an avatar switcher lets them flip between
// each child's personal hub.
export default function GuardianDashboard() {
  const { user } = useAuth();
  const { items: announcements } = useAnnouncements();
  const [children, setChildren] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/guardians/me/players')
      .then((res) => {
        const mapped = res.data.map(toHubPlayer);
        setChildren(mapped);
        if (mapped[0]) setSelectedId(mapped[0].id);
      })
      .catch((err) =>
        setError(
          err.response?.data?.error ||
            'We could not load the players linked to your account.'
        )
      )
      .finally(() => setLoading(false));
  }, []);

  const selected = children.find((c) => c.id === selectedId) || null;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={0.5}>
        Hi {user?.firstName} 👋
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Follow your {children.length > 1 ? "children's" : "child's"} progress.
      </Typography>

      <PinnedAnnouncements announcements={announcements} />

      {loading ? (
        <Stack alignItems="center" py={6}>
          <CircularProgress />
        </Stack>
      ) : error ? (
        <Alert severity="info">{error}</Alert>
      ) : children.length === 0 ? (
        <Alert severity="info">
          No players are linked to your account yet. Please contact your club admin.
        </Alert>
      ) : (
        <>
          {children.length > 1 && (
            <Stack direction="row" spacing={1.5} mb={2} flexWrap="wrap" useFlexGap>
              {children.map((c) => (
                <Chip
                  key={c.id}
                  avatar={
                    <Avatar src={c.photoUrl || undefined}>
                      {c.firstName?.[0]}
                    </Avatar>
                  }
                  label={`${c.firstName} ${c.lastName}`}
                  color={c.id === selectedId ? 'primary' : 'default'}
                  variant={c.id === selectedId ? 'filled' : 'outlined'}
                  onClick={() => setSelectedId(c.id)}
                  sx={{ py: 2.5, fontWeight: 600 }}
                />
              ))}
            </Stack>
          )}
          <PlayerHub player={selected} />
        </>
      )}
    </Box>
  );
}

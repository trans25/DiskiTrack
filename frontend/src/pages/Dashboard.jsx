import { useEffect, useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Box,
  Stack,
  Alert,
  AlertTitle,
  Chip,
  Button,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import BadgeIcon from '@mui/icons-material/Badge';
import ApartmentIcon from '@mui/icons-material/Apartment';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import CampaignIcon from '@mui/icons-material/Campaign';
import PushPinIcon from '@mui/icons-material/PushPin';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useAnnouncements } from '../context/AnnouncementsContext.jsx';
import CoachDashboard from './CoachDashboard.jsx';

const StatCard = ({ icon, label, value, hint, onClick }) => {
  const content = (
    <CardContent sx={{ p: 3 }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: 2.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'primary.main',
            bgcolor: 'primary.light',
            backgroundImage: 'linear-gradient(135deg, rgba(21,101,192,0.12), rgba(21,101,192,0.04))',
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h4" fontWeight={700} lineHeight={1.1}>
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            {label}
          </Typography>
          {hint && (
            <Typography variant="caption" color="text.secondary">
              {hint}
            </Typography>
          )}
        </Box>
      </Stack>
    </CardContent>
  );

  return (
    <Card
      sx={{
        height: '100%',
        ...(onClick && {
          '&:hover': {
            boxShadow: '0 8px 24px rgba(16, 24, 40, 0.10)',
            transform: 'translateY(-2px)',
            borderColor: 'primary.light',
          },
        }),
      }}
    >
      {onClick ? (
        <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
          {content}
        </CardActionArea>
      ) : (
        content
      )}
    </Card>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
  const [stats, setStats] = useState(null);
  const { items: announcements } = useAnnouncements();
  const pinned = announcements.filter((a) => a.isPinned).slice(0, 3);

  useEffect(() => {
    api.get('/stats/dashboard').then((res) => setStats(res.data));
  }, []);

  if (user?.role === 'COACH') {
    return <CoachDashboard firstName={user?.firstName} />;
  }

  const u = stats?.users || {};
  const usersHint = `${u.clubAdmins || 0} admins · ${u.coaches || 0} coaches · ${u.analysts || 0} analysts`;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={1}>
        Welcome, {user?.firstName}
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        {isSystemAdmin
          ? 'Platform overview across all clubs.'
          : 'Here is what is happening at your club today.'}
      </Typography>

      {pinned.length > 0 && (
        <Stack spacing={1.5} mb={3}>
          {pinned.map((a) => (
            <Alert
              key={a.id}
              severity="info"
              icon={<CampaignIcon />}
              sx={{ alignItems: 'flex-start', '& .MuiAlert-message': { width: '100%' } }}
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => navigate('/announcements')}
                >
                  View all
                </Button>
              }
            >
              <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Chip
                  size="small"
                  color="primary"
                  icon={<PushPinIcon />}
                  label="Pinned"
                />
                {a.title}
              </AlertTitle>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {a.body}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {a.authorName}
              </Typography>
            </Alert>
          ))}
        </Stack>
      )}

      <Grid container spacing={2}>
        {isSystemAdmin && (
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={<ApartmentIcon fontSize="large" />}
              label="Clubs"
              value={stats?.clubs ?? '—'}
              onClick={() => navigate('/teams')}
            />
          </Grid>
        )}
        {!isSystemAdmin && (
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={<GroupsIcon fontSize="large" />}
              label="Teams"
              value={stats?.teams ?? '—'}
              onClick={() => navigate('/teams')}
            />
          </Grid>
        )}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<LiveTvIcon fontSize="large" />}
            label="Live Matches"
            value={stats?.liveMatches ?? '—'}
            onClick={() => navigate('/matches')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<BadgeIcon fontSize="large" />}
            label="Users"
            value={u.total ?? '—'}
            hint={usersHint}
            onClick={() => navigate('/users')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<PersonIcon fontSize="large" />}
            label="Players"
            value={stats?.players ?? '—'}
            onClick={() => navigate('/players')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<CampaignIcon fontSize="large" />}
            label="Announcements"
            value={stats?.announcements ?? '—'}
            onClick={() => navigate('/announcements')}
          />
        </Grid>
      </Grid>
    </Box>
  );
}

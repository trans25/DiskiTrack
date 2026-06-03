import { useNavigate } from 'react-router-dom';
import { Stack, Alert, AlertTitle, Chip, Button, Typography } from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import PushPinIcon from '@mui/icons-material/PushPin';

// Renders the club's pinned announcements. Shared by the admin, player and
// guardian dashboards so every role sees messages intended for them.
export default function PinnedAnnouncements({ announcements = [], max = 3 }) {
  const navigate = useNavigate();
  const pinned = announcements.filter((a) => a.isPinned).slice(0, max);

  if (pinned.length === 0) return null;

  return (
    <Stack spacing={1.5} mb={3}>
      {pinned.map((a) => (
        <Alert
          key={a.id}
          severity="info"
          icon={<CampaignIcon />}
          sx={{ alignItems: 'flex-start', '& .MuiAlert-message': { width: '100%' } }}
          action={
            <Button color="inherit" size="small" onClick={() => navigate('/announcements')}>
              View all
            </Button>
          }
        >
          <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Chip size="small" color="primary" icon={<PushPinIcon />} label="Pinned" />
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
  );
}

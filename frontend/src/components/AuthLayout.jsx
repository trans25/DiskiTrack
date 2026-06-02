import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';

// Responsive shell shared by all auth screens (login, register, forgot, reset,
// invite). Centers a card on every screen size with comfortable padding.
export default function AuthLayout({ title, subtitle, children, maxWidth = 420 }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)',
        p: { xs: 2, sm: 3 },
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth,
          borderRadius: 3,
          boxShadow: '0 10px 40px rgba(15,23,42,0.12)',
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack alignItems="center" spacing={1} mb={3}>
            <SportsSoccerIcon sx={{ fontSize: 44, color: 'primary.main' }} />
            <Typography variant="h5" fontWeight={800} color="primary">
              DiskiTrack
            </Typography>
            {title && (
              <Typography variant="h6" fontWeight={700} textAlign="center">
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="body2" color="text.secondary" textAlign="center">
                {subtitle}
              </Typography>
            )}
          </Stack>
          {children}
        </CardContent>
      </Card>
    </Box>
  );
}

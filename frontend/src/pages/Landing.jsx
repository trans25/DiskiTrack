import { Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Grid,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import InsightsIcon from '@mui/icons-material/Insights';
import GroupsIcon from '@mui/icons-material/Groups';
import SpeedIcon from '@mui/icons-material/Speed';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import SecurityIcon from '@mui/icons-material/Security';
import DevicesIcon from '@mui/icons-material/Devices';
import PlayCircleFilledWhiteIcon from '@mui/icons-material/PlayCircleFilledWhite';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useAuth } from '../context/AuthContext.jsx';

const features = [
  {
    icon: <PlayCircleFilledWhiteIcon />,
    title: 'Control the match from anywhere',
    body: 'Track matches with DiskiTrack. See what is happening in the game as it happens, make notes, and capture the key moments from your phone, tablet or computer.',
  },
  {
    icon: <InsightsIcon />,
    title: 'See how your players are doing',
    body: 'Look at how your players are performing and make decisions based on what the numbers tell you, all laid out in clean, easy-to-read charts.',
  },
  {
    icon: <GroupsIcon />,
    title: 'Manage your team',
    body: 'Make a list of your players and see who is playing well. DiskiTrack helps you manage your whole team in one place.',
  },
  {
    icon: <FitnessCenterIcon />,
    title: 'Schedule training',
    body: 'Schedule training sessions and see who is coming, so your coaching staff always knows where everyone stands.',
  },
  {
    icon: <EmojiEventsIcon />,
    title: 'Keep track of the standings',
    body: 'It even helps you keep track of where your team is in the standings, updated for you automatically.',
  },
  {
    icon: <SecurityIcon />,
    title: 'Safe and secure',
    body: 'DiskiTrack is safe and secure. Each club has its own private space, and only the right people can see the information.',
  },
];

const roles = [
  {
    title: 'System Admin',
    body: 'This person is in charge of the platform and approves new clubs before they get access.',
  },
  {
    title: 'Club Admin',
    body: 'This person runs the club day to day, including the teams, players, staff, matches and announcements.',
  },
  {
    title: 'Coach',
    body: 'This person picks the team and runs the training sessions.',
  },
  {
    title: 'Analyst',
    body: 'This person looks at the numbers and helps make decisions.',
  },
];

const steps = [
  {
    title: 'Sign up',
    body: 'Sign up for DiskiTrack and prove you are from the club by uploading a document.',
  },
  {
    title: 'Wait for approval',
    body: 'Wait for approval from the system administrator. Once you are approved, your club space is ready.',
  },
  {
    title: 'Make your team',
    body: 'Make your team. Add your players and coaches so everyone is in one place.',
  },
  {
    title: 'Start tracking',
    body: 'Start tracking your matches and training sessions, and watch your standings update along the way.',
  },
];

const FeatureCard = ({ icon, title, body }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ p: 3 }}>
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(21,101,192,0.08)',
          color: 'primary.main',
          mb: 2,
        }}
      >
        {icon}
      </Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
        {body}
      </Typography>
    </CardContent>
  </Card>
);

export default function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* ---------------------------------------------------------------- */}
      {/* Top navigation                                                   */}
      {/* ---------------------------------------------------------------- */}
      <AppBar position="sticky" elevation={0}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ py: 1 }}>
            <SportsSoccerIcon sx={{ color: 'primary.main', mr: 1 }} />
            <Typography variant="h6" fontWeight={800} color="primary" sx={{ flexGrow: 1 }}>
              DiskiTrack
            </Typography>
            <Stack direction="row" spacing={1}>
              {isAuthenticated ? (
                <Button component={RouterLink} to="/dashboard" endIcon={<ArrowForwardIcon />}>
                  Open Dashboard
                </Button>
              ) : (
                <>
                  <Button component={RouterLink} to="/login" variant="text" sx={{ color: 'text.primary' }}>
                    Log in
                  </Button>
                  <Button component={RouterLink} to="/register">
                    Register your club
                  </Button>
                </>
              )}
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      {/* ---------------------------------------------------------------- */}
      {/* Development stage notice                                         */}
      {/* ---------------------------------------------------------------- */}
      <Box
        sx={{
          bgcolor: 'rgba(21,101,192,0.08)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: 1,
        }}
      >
        <Container maxWidth="lg">
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" flexWrap="wrap">
            <SpeedIcon fontSize="small" color="primary" />
            <Typography variant="body2" color="text.secondary" textAlign="center">
              DiskiTrack is in its <Box component="span" sx={{ fontWeight: 700, color: 'primary.main' }}>final development stages</Box>. You may spot small changes as we put the finishing touches in place.
            </Typography>
          </Stack>
        </Container>
      </Box>

      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                             */}
      {/* ---------------------------------------------------------------- */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 55%, #1e88e5 100%)',
          color: '#fff',
          py: { xs: 8, md: 12 },
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={7}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{
                  display: 'inline-flex',
                  px: 1.5,
                  py: 0.5,
                  mb: 3,
                  borderRadius: 999,
                  bgcolor: 'rgba(255,255,255,0.12)',
                }}
              >
                <SpeedIcon fontSize="small" />
                <Typography variant="caption" fontWeight={600}>
                  A tool for football clubs · In its final development stages
                </Typography>
              </Stack>
              <Typography
                variant="h2"
                fontWeight={800}
                sx={{ fontSize: { xs: '2.25rem', md: '3.25rem' }, lineHeight: 1.1, mb: 2 }}
              >
                Manage your team, from the field to the office.
              </Typography>
              <Typography variant="h6" fontWeight={400} sx={{ opacity: 0.9, mb: 4, maxWidth: 560 }}>
                DiskiTrack is a tool for football clubs. It helps them manage their teams,
                track matches and keep an eye on training, and make better decisions. You
                can use it on your phone, tablet or computer.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                {isAuthenticated ? (
                  <Button
                    component={RouterLink}
                    to="/dashboard"
                    size="large"
                    endIcon={<ArrowForwardIcon />}
                    sx={{ bgcolor: '#fff', color: 'primary.main', '&:hover': { bgcolor: '#f1f5f9' } }}
                  >
                    Open Dashboard
                  </Button>
                ) : (
                  <>
                    <Button
                      component={RouterLink}
                      to="/register"
                      size="large"
                      endIcon={<ArrowForwardIcon />}
                      sx={{ bgcolor: '#fff', color: 'primary.main', '&:hover': { bgcolor: '#f1f5f9' } }}
                    >
                      Register your club
                    </Button>
                    <Button
                      component={RouterLink}
                      to="/login"
                      size="large"
                      variant="outlined"
                      sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.6)', '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}
                    >
                      Log in
                    </Button>
                  </>
                )}
              </Stack>
            </Grid>
            <Grid item xs={12} md={5}>
              <Stack spacing={2}>
                {[
                  { icon: <PlayCircleFilledWhiteIcon />, label: 'Control the match from anywhere' },
                  { icon: <InsightsIcon />, label: 'See how your players are doing' },
                  { icon: <DevicesIcon />, label: 'Works on your phone, tablet & computer' },
                ].map((item) => (
                  <Stack
                    key={item.label}
                    direction="row"
                    spacing={2}
                    alignItems="center"
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      bgcolor: 'rgba(255,255,255,0.1)',
                      backdropFilter: 'blur(6px)',
                    }}
                  >
                    <Box sx={{ color: '#fff', display: 'flex' }}>{item.icon}</Box>
                    <Typography fontWeight={600}>{item.label}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ---------------------------------------------------------------- */}
      {/* Features                                                         */}
      {/* ---------------------------------------------------------------- */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 10 } }}>
        <Stack alignItems="center" textAlign="center" spacing={1.5} mb={6}>
          <Typography variant="overline" color="primary" fontWeight={700} letterSpacing={1}>
            Everything your club needs
          </Typography>
          <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' } }}>
            One tool for the whole season
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 640 }}>
            DiskiTrack is with you for the season. From the first game to the last, it helps
            your players, coaches and staff work together.
          </Typography>
        </Stack>
        <Grid container spacing={3}>
          {features.map((f) => (
            <Grid item xs={12} sm={6} md={4} key={f.title}>
              <FeatureCard {...f} />
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* ---------------------------------------------------------------- */}
      {/* Built for every role                                             */}
      {/* ---------------------------------------------------------------- */}
      <Box sx={{ bgcolor: '#fff', borderTop: '1px solid', borderBottom: '1px solid', borderColor: 'divider', py: { xs: 8, md: 10 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={5}>
              <Typography variant="overline" color="primary" fontWeight={700} letterSpacing={1}>
                Role-based by design
              </Typography>
              <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' }, mb: 2 }}>
                Built for everyone in the club
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.8 }}>
                DiskiTrack is designed for everyone in the club. It gives each person the
                tools they need to do their job, and keeps everyone else's data safe.
              </Typography>
              <Stack spacing={1.5}>
                {['Secure JWT authentication', 'Strict per-club data isolation', 'Granular role-based access control'].map((point) => (
                  <Stack key={point} direction="row" spacing={1.5} alignItems="center">
                    <CheckCircleIcon color="primary" fontSize="small" />
                    <Typography variant="body2" fontWeight={600}>
                      {point}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Grid>
            <Grid item xs={12} md={7}>
              <Grid container spacing={2}>
                {roles.map((r) => (
                  <Grid item xs={12} sm={6} key={r.title}>
                    <Card sx={{ height: '100%' }}>
                      <CardContent sx={{ p: 3 }}>
                        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                          <VerifiedUserIcon color="primary" fontSize="small" />
                          <Typography variant="subtitle1" fontWeight={700}>
                            {r.title}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                          {r.body}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ---------------------------------------------------------------- */}
      {/* How it works                                                     */}
      {/* ---------------------------------------------------------------- */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 10 } }}>
        <Stack alignItems="center" textAlign="center" spacing={1.5} mb={6}>
          <Typography variant="overline" color="primary" fontWeight={700} letterSpacing={1}>
            Getting started
          </Typography>
          <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' } }}>
            Getting started is easy
          </Typography>
        </Stack>
        <Grid container spacing={3}>
          {steps.map((s, i) => (
            <Grid item xs={12} sm={6} md={3} key={s.title}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      mb: 2,
                    }}
                  >
                    {i + 1}
                  </Box>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    {s.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {s.body}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* ---------------------------------------------------------------- */}
      {/* Final call to action                                             */}
      {/* ---------------------------------------------------------------- */}
      <Box sx={{ px: 2, pb: { xs: 8, md: 10 } }}>
        <Container maxWidth="lg" disableGutters>
          <Box
            sx={{
              borderRadius: 4,
              p: { xs: 4, md: 8 },
              textAlign: 'center',
              background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)',
              color: '#fff',
            }}
          >
            <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' }, mb: 2 }}>
              Ready to bring your club into the game?
            </Typography>
            <Typography variant="h6" fontWeight={400} sx={{ opacity: 0.9, mb: 4, maxWidth: 620, mx: 'auto' }}>
              Join DiskiTrack and give your players, coaches and staff the tools they need
              to succeed. Every training session, every match, every season.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
              <Button
                component={RouterLink}
                to={isAuthenticated ? '/dashboard' : '/register'}
                size="large"
                endIcon={<ArrowForwardIcon />}
                sx={{ bgcolor: '#fff', color: 'primary.main', '&:hover': { bgcolor: '#f1f5f9' } }}
              >
                {isAuthenticated ? 'Open Dashboard' : 'Register your club'}
              </Button>
              {!isAuthenticated && (
                <Button
                  component={RouterLink}
                  to="/login"
                  size="large"
                  variant="outlined"
                  sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.6)', '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}
                >
                  Log in
                </Button>
              )}
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* ---------------------------------------------------------------- */}
      {/* Footer                                                           */}
      {/* ---------------------------------------------------------------- */}
      <Divider />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <SportsSoccerIcon sx={{ color: 'primary.main' }} />
            <Typography variant="subtitle1" fontWeight={800} color="primary">
              DiskiTrack
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            © 2025 DiskiTrack. Live football analytics, for clubs.
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button component={RouterLink} to="/login" variant="text" size="small" sx={{ color: 'text.secondary' }}>
              Log in
            </Button>
            <Button component={RouterLink} to="/register" variant="text" size="small" sx={{ color: 'primary.main' }}>
              Register
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}

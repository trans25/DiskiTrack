import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
  Avatar,
  Button,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import HistoryIcon from '@mui/icons-material/History';
import InsightsIcon from '@mui/icons-material/Insights';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import CampaignIcon from '@mui/icons-material/Campaign';
import BadgeIcon from '@mui/icons-material/Badge';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import RateReviewIcon from '@mui/icons-material/RateReview';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LogoutIcon from '@mui/icons-material/Logout';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import PrivacyTipIcon from '@mui/icons-material/PrivacyTip';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import { Badge } from '@mui/material';
import { useAuth } from '../context/AuthContext.jsx';
import { useAnnouncements } from '../context/AnnouncementsContext.jsx';
import NotificationBell from './NotificationBell.jsx';

const drawerWidth = 240;

const navItems = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { label: 'Teams', icon: <GroupsIcon />, path: '/teams', roles: ['SYSTEM_ADMIN', 'CLUB_ADMIN', 'COACH', 'ANALYST'] },
  { label: 'Players', icon: <PersonIcon />, path: '/players', roles: ['CLUB_ADMIN', 'COACH', 'ANALYST', 'GUARDIAN'] },
  { label: 'Matches', icon: <SportsSoccerIcon />, path: '/matches' },
  { label: 'Standings', icon: <EmojiEventsIcon />, path: '/standings' },
  { label: 'Training', icon: <FitnessCenterIcon />, path: '/training', roles: ['CLUB_ADMIN', 'COACH'] },
  { label: 'Match History', icon: <HistoryIcon />, path: '/history' },
  { label: 'Analytics', icon: <InsightsIcon />, path: '/analytics', roles: ['SYSTEM_ADMIN', 'CLUB_ADMIN', 'COACH', 'ANALYST'] },
  { label: 'Announcements', icon: <CampaignIcon />, path: '/announcements' },
  { label: 'Members', icon: <BadgeIcon />, path: '/users', roles: ['CLUB_ADMIN', 'SYSTEM_ADMIN'] },
  { label: 'Billing', icon: <CreditCardIcon />, path: '/billing', roles: ['CLUB_ADMIN'] },
  { label: 'Privacy', icon: <PrivacyTipIcon />, path: '/privacy' },
  { label: 'Audit Log', icon: <FactCheckIcon />, path: '/admin/audit', roles: ['CLUB_ADMIN', 'SYSTEM_ADMIN'] },
  { label: 'Applications', icon: <VerifiedUserIcon />, path: '/admin/applications', roles: ['SYSTEM_ADMIN'] },
  { label: 'Reviews', icon: <RateReviewIcon />, path: '/admin/reviews', roles: ['SYSTEM_ADMIN'] },
];

export default function AppLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { unreadCount } = useAnnouncements();

  const handleNav = (path) => {
    navigate(path);
    if (isMobile) setMobileOpen(false);
  };

  const drawer = (
    <Box>
      <Toolbar>
        <SportsSoccerIcon sx={{ color: 'primary.main', mr: 1 }} />
        <Typography variant="h6" fontWeight={700} color="primary">
          DiskiTrack
        </Typography>
      </Toolbar>
      <List>
        {navItems
          .filter((item) => !item.roles || item.roles.includes(user?.role))
          .map((item) => (
          <ListItemButton
            key={item.path}
            selected={location.pathname === item.path}
            onClick={() => handleNav(item.path)}
          >
            <ListItemIcon sx={{ color: 'primary.main' }}>
              {item.path === '/announcements' ? (
                <Badge badgeContent={unreadCount} color="error">
                  {item.icon}
                </Badge>
              ) : (
                item.icon
              )}
            </ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {isMobile && (
            <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ flexGrow: 1 }} fontWeight={700}>
            DiskiTrack
          </Typography>
          <Avatar sx={{ bgcolor: 'primary.dark', width: 32, height: 32, mr: 1 }}>
            {user?.firstName?.[0]}
          </Avatar>
          <NotificationBell />
          <Button color="inherit" startIcon={<LogoutIcon />} onClick={logout}>
            {!isMobile && 'Logout'}
          </Button>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: '1px solid #e2e8f0',
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />
        {location.pathname !== '/dashboard' && (
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{ mb: 2 }}
          >
            Back
          </Button>
        )}
        <Outlet />
      </Box>
    </Box>
  );
}

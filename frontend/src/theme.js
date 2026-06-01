import { createTheme } from '@mui/material/styles';

// Blue buttons, white surfaces — DiskiTrack brand.
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1565c0', dark: '#0d47a1', light: '#5e92f3' },
    background: { default: '#f4f6fb', paper: '#ffffff' },
    text: { primary: '#0f172a', secondary: '#64748b' },
    divider: '#e9edf5',
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: 'Inter, Roboto, Helvetica, Arial, sans-serif',
    h5: { fontWeight: 700, letterSpacing: '-0.01em' },
    h6: { fontWeight: 700, letterSpacing: '-0.01em' },
    subtitle1: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: { variant: 'contained', disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 10 },
        // Large, touch-friendly variant for the live match screen.
        sizeLarge: { padding: '16px 20px', fontSize: '1.05rem' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#0f172a',
          boxShadow: 'none',
          borderBottom: '1px solid #e9edf5',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid #e9edf5',
          borderRadius: 16,
          boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
          transition: 'box-shadow 160ms ease, transform 160ms ease, border-color 160ms ease',
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: { paddingBottom: 12 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 8 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
  },
});

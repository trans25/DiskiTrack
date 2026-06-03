import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Button, TextField, Alert, Stack, Link, Typography, ToggleButton, ToggleButtonGroup, Divider } from '@mui/material';
import { useAuth } from '../context/AuthContext.jsx';
import AuthLayout from '../components/AuthLayout.jsx';

export default function Login() {
  const { login, guardianLogin, guestLogin } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [childId, setChildId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'guardian') {
        await guardianLogin(childId.trim());
      } else {
        await login(email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await guestLogin();
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Guest login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout subtitle="Live football analytics">
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <ToggleButtonGroup
        exclusive
        size="small"
        color="primary"
        value={mode}
        onChange={(e, v) => {
          if (v) {
            setMode(v);
            setError('');
          }
        }}
        fullWidth
        sx={{ mb: 2 }}
      >
        <ToggleButton value="user">Staff (email)</ToggleButton>
        <ToggleButton value="guardian">Player / Guardian (ID)</ToggleButton>
      </ToggleButtonGroup>

      <form onSubmit={handleSubmit}>
        {mode === 'guardian' ? (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Enter the player's identification number used during registration. Players and guardians both sign in with this ID.
            </Typography>
            <TextField
              label="Player ID number"
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              required
              fullWidth
              autoFocus
            />
            <Button type="submit" size="large" disabled={loading} fullWidth>
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </Stack>
        ) : (
          <Stack spacing={2}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
              autoFocus
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
            />
            <Stack direction="row" justifyContent="flex-end">
              <Link component={RouterLink} to="/forgot-password" variant="body2" underline="hover">
                Forgot password?
              </Link>
            </Stack>
            <Button type="submit" size="large" disabled={loading} fullWidth>
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </Stack>
        )}
      </form>

      <Divider sx={{ my: 2 }}>or</Divider>

      <Button
        variant="outlined"
        size="large"
        fullWidth
        disabled={loading}
        onClick={handleGuestLogin}
      >
        Continue as Guest (Demo)
      </Button>
      <Typography variant="caption" display="block" textAlign="center" color="text.secondary" sx={{ mt: 1 }}>
        Explore the platform with full Club Admin access — no approval needed.
      </Typography>

      <Typography variant="body2" textAlign="center" color="text.secondary" sx={{ mt: 3 }}>
        New club?{' '}
        <Link component={RouterLink} to="/register" underline="hover" fontWeight={600}>
          Create an account
        </Link>
      </Typography>
    </AuthLayout>
  );
}

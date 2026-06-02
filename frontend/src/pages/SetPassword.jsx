import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import {
  Button,
  TextField,
  Alert,
  Stack,
  Link,
  Typography,
  CircularProgress,
  Box,
} from '@mui/material';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import AuthLayout from '../components/AuthLayout.jsx';

// Shared screen for both flows:
//   /reset-password?token=...   -> purpose RESET
//   /accept-invite?token=...    -> purpose INVITE
export default function SetPassword({ purpose }) {
  const isInvite = purpose === 'INVITE';
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [verifying, setVerifying] = useState(true);
  const [info, setInfo] = useState(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenError('No token provided.');
      setVerifying(false);
      return;
    }
    api
      .get('/auth/verify-token', { params: { token, purpose } })
      .then((res) => setInfo(res.data))
      .catch((err) =>
        setTokenError(err.response?.data?.error || 'This link is invalid or has expired')
      )
      .finally(() => setVerifying(false));
  }, [token, purpose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password, purpose);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not set your password');
    } finally {
      setLoading(false);
    }
  };

  const title = isInvite ? 'Activate your account' : 'Reset password';

  if (verifying) {
    return (
      <AuthLayout title={title}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </AuthLayout>
    );
  }

  if (tokenError) {
    return (
      <AuthLayout title={title}>
        <Stack spacing={3}>
          <Alert severity="error">{tokenError}</Alert>
          <Button
            component={RouterLink}
            to={isInvite ? '/login' : '/forgot-password'}
            variant="outlined"
            fullWidth
          >
            {isInvite ? 'Back to sign in' : 'Request a new link'}
          </Button>
        </Stack>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={title}
      subtitle={
        info
          ? `${isInvite ? 'Welcome' : 'Hi'} ${info.firstName} — set a new password for ${info.email}`
          : undefined
      }
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <form onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <TextField
            label="New password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            autoFocus
            helperText="Min 6 characters"
          />
          <TextField
            label="Confirm password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            fullWidth
          />
          <Button type="submit" size="large" disabled={loading} fullWidth>
            {loading ? 'Saving…' : isInvite ? 'Activate account' : 'Reset password'}
          </Button>
        </Stack>
      </form>

      <Typography variant="body2" textAlign="center" color="text.secondary" sx={{ mt: 3 }}>
        <Link component={RouterLink} to="/login" underline="hover" fontWeight={600}>
          Back to sign in
        </Link>
      </Typography>
    </AuthLayout>
  );
}

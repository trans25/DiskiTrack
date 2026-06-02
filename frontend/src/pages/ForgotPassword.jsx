import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Button, TextField, Alert, Stack, Link, Typography } from '@mui/material';
import { useAuth } from '../context/AuthContext.jsx';
import AuthLayout from '../components/AuthLayout.jsx';

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      setMessage(res.message || 'Check your email for a reset link.');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot password"
      subtitle="Enter your email and we'll send you a reset link"
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message ? (
        <Stack spacing={3}>
          <Alert severity="success">{message}</Alert>
          <Button component={RouterLink} to="/login" variant="outlined" fullWidth>
            Back to sign in
          </Button>
        </Stack>
      ) : (
        <form onSubmit={handleSubmit}>
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
            <Button type="submit" size="large" disabled={loading} fullWidth>
              {loading ? 'Sending…' : 'Send reset link'}
            </Button>
          </Stack>
        </form>
      )}

      <Typography variant="body2" textAlign="center" color="text.secondary" sx={{ mt: 3 }}>
        Remembered it?{' '}
        <Link component={RouterLink} to="/login" underline="hover" fontWeight={600}>
          Sign in
        </Link>
      </Typography>
    </AuthLayout>
  );
}

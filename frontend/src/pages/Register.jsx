import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Button,
  TextField,
  Alert,
  Stack,
  Link,
  Typography,
  Grid,
  Box,
  Autocomplete,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DescriptionIcon from '@mui/icons-material/Description';
import { useAuth } from '../context/AuthContext.jsx';
import AuthLayout from '../components/AuthLayout.jsx';
import { COUNTRIES, citiesForCountry } from '../utils/geo.js';

const MAX_PROOF_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_PROOF =
  '.pdf,.png,.jpg,.jpeg,.webp,image/*,application/pdf';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    clubName: '',
    country: '',
    city: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirm: '',
  });
  const [proof, setProof] = useState(null); // { document, filename }
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleFile = (e) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PROOF_BYTES) {
      setError('Proof file must be 5 MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setProof({ document: reader.result, filename: file.name });
    reader.onerror = () => setError('Could not read the selected file.');
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    if (!proof) {
      setError('Please upload a document proving you represent this club.');
      return;
    }
    setLoading(true);
    try {
      const { confirm, ...rest } = form;
      await register({
        ...rest,
        proofDocument: proof.document,
        proofFilename: proof.filename,
      });
      setSubmitted(true);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Registration failed'
      );
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <AuthLayout
        title="Application submitted"
        subtitle="Your club is now pending review"
        maxWidth={520}
      >
        <Stack spacing={3} alignItems="center" textAlign="center" sx={{ py: 2 }}>
          <CheckCircleIcon color="success" sx={{ fontSize: 64 }} />
          <Typography variant="body1" color="text.secondary">
            Thanks! We&apos;ve received your registration for{' '}
            <strong>{form.clubName}</strong> and your proof of representation.
            Our team will review it and email <strong>{form.email}</strong> once
            your club is approved. You can sign in after approval.
          </Typography>
          <Button
            size="large"
            fullWidth
            onClick={() => navigate('/login')}
          >
            Back to sign in
          </Button>
        </Stack>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your club"
      subtitle="Register your club and submit proof of representation"
      maxWidth={520}
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <Typography variant="overline" color="text.secondary">
            Club details
          </Typography>
          <TextField label="Club name" value={form.clubName} onChange={set('clubName')} required fullWidth autoFocus />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                freeSolo
                autoHighlight
                options={COUNTRIES}
                value={form.country}
                onChange={(e, v) =>
                  setForm((f) => ({ ...f, country: v || '', city: '' }))
                }
                onInputChange={(e, v, reason) => {
                  if (reason === 'input') setForm((f) => ({ ...f, country: v }));
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Country" fullWidth />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                freeSolo
                autoHighlight
                options={citiesForCountry(form.country)}
                value={form.city}
                onChange={(e, v) => setForm((f) => ({ ...f, city: v || '' }))}
                onInputChange={(e, v, reason) => {
                  if (reason === 'input') setForm((f) => ({ ...f, city: v }));
                }}
                renderInput={(params) => (
                  <TextField {...params} label="City" fullWidth />
                )}
              />
            </Grid>
          </Grid>

          <Typography variant="overline" color="text.secondary" sx={{ mt: 1 }}>
            Your admin account
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField label="First name" value={form.firstName} onChange={set('firstName')} required fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Last name" value={form.lastName} onChange={set('lastName')} required fullWidth />
            </Grid>
          </Grid>
          <TextField label="Email" type="email" value={form.email} onChange={set('email')} required fullWidth />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField label="Password" type="password" value={form.password} onChange={set('password')} required fullWidth helperText="Min 6 characters" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Confirm password" type="password" value={form.confirm} onChange={set('confirm')} required fullWidth />
            </Grid>
          </Grid>

          <Typography variant="overline" color="text.secondary" sx={{ mt: 1 }}>
            Proof of representation
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload an official document (club letterhead, registration
            certificate, ID or appointment letter) showing you&apos;re authorised
            to represent this club. PDF or image, max 5 MB.
          </Typography>
          <Button
            component="label"
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            fullWidth
            sx={{ py: 1.4 }}
          >
            {proof ? 'Change document' : 'Upload proof document'}
            <input
              type="file"
              hidden
              accept={ACCEPTED_PROOF}
              onChange={handleFile}
            />
          </Button>
          {proof && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1.2,
                borderRadius: 1,
                bgcolor: 'action.hover',
              }}
            >
              <DescriptionIcon color="primary" fontSize="small" />
              <Typography variant="body2" noWrap title={proof.filename}>
                {proof.filename}
              </Typography>
            </Box>
          )}

          <Button type="submit" size="large" disabled={loading} fullWidth>
            {loading ? 'Submitting…' : 'Submit for approval'}
          </Button>
        </Stack>
      </form>

      <Typography variant="body2" textAlign="center" color="text.secondary" sx={{ mt: 3 }}>
        Already have an account?{' '}
        <Link component={RouterLink} to="/login" underline="hover" fontWeight={600}>
          Sign in
        </Link>
      </Typography>
    </AuthLayout>
  );
}

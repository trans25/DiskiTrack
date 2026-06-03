import { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  MenuItem,
  Rating,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import { api } from '../api/client.js';

const roleOptions = ['Coach', 'Club Admin', 'Analyst', 'Player', 'Parent / Guardian', 'Football fan'];

function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

export default function ReviewsSection() {
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ count: 0, average: 0 });
  const [form, setForm] = useState({ name: '', role: '', rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get('/reviews');
      setReviews(data.reviews || []);
      setSummary(data.summary || { count: 0, average: 0 });
    } catch {
      // Landing page should never break if reviews fail to load.
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.name.trim().length < 2 || form.comment.trim().length < 3) {
      setError('Please add your name and a short comment.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/reviews', {
        name: form.name.trim(),
        role: form.role || undefined,
        rating: form.rating,
        comment: form.comment.trim(),
      });
      setDone(true);
      setForm({ name: '', role: '', rating: 5, comment: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send your review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ bgcolor: '#f1f5f9', py: { xs: 8, md: 10 }, px: 2 }}>
      <Container maxWidth="lg" disableGutters>
        <Stack spacing={1} alignItems="center" textAlign="center" sx={{ mb: 5 }}>
          <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' } }}>
            What people are saying
          </Typography>
          <Typography variant="h6" fontWeight={400} color="text.secondary" sx={{ maxWidth: 620 }}>
            Tried DiskiTrack? We would love to hear your opinion. Leave a review and help other
            clubs decide.
          </Typography>
          {summary.count > 0 && (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
              <Rating value={summary.average} precision={0.1} readOnly />
              <Typography variant="body2" color="text.secondary">
                {summary.average} out of 5 ({summary.count} {summary.count === 1 ? 'review' : 'reviews'})
              </Typography>
            </Stack>
          )}
        </Stack>

        <Grid container spacing={4}>
          {/* Existing reviews */}
          <Grid item xs={12} md={7}>
            {reviews.length === 0 ? (
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Typography color="text.secondary">
                    No reviews yet. Be the first to share your opinion.
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <Stack spacing={2}>
                {reviews.map((r) => (
                  <Card key={r.id} variant="outlined" sx={{ borderRadius: 3 }}>
                    <CardContent>
                      <Stack direction="row" spacing={2} alignItems="flex-start">
                        <Avatar sx={{ bgcolor: 'primary.main' }}>{initials(r.name)}</Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap">
                            <Typography fontWeight={700}>{r.name}</Typography>
                            <Rating value={r.rating} size="small" readOnly />
                          </Stack>
                          {r.role && (
                            <Typography variant="caption" color="text.secondary">
                              {r.role}
                            </Typography>
                          )}
                          <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                            <FormatQuoteIcon sx={{ color: 'primary.light', transform: 'scaleX(-1)' }} fontSize="small" />
                            <Typography variant="body2" color="text.secondary">
                              {r.comment}
                            </Typography>
                          </Stack>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Grid>

          {/* Submission form */}
          <Grid item xs={12} md={5}>
            <Card sx={{ borderRadius: 3, position: { md: 'sticky' }, top: 24 }}>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>
                  Leave a review
                </Typography>
                {done ? (
                  <Alert severity="success" onClose={() => setDone(false)}>
                    Thanks for your feedback. Your review has been submitted and will appear here
                    once it is approved.
                  </Alert>
                ) : (
                  <Box component="form" onSubmit={handleSubmit}>
                    <Stack spacing={2}>
                      {error && <Alert severity="error">{error}</Alert>}
                      <TextField
                        label="Your name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                        fullWidth
                      />
                      <TextField
                        label="Your role (optional)"
                        select
                        value={form.role}
                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                        fullWidth
                      >
                        <MenuItem value="">Prefer not to say</MenuItem>
                        {roleOptions.map((opt) => (
                          <MenuItem key={opt} value={opt}>
                            {opt}
                          </MenuItem>
                        ))}
                      </TextField>
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Your rating
                        </Typography>
                        <Rating
                          value={form.rating}
                          onChange={(_e, value) => setForm({ ...form, rating: value || 1 })}
                        />
                      </Box>
                      <TextField
                        label="Your opinion"
                        value={form.comment}
                        onChange={(e) => setForm({ ...form, comment: e.target.value })}
                        required
                        multiline
                        minRows={4}
                        fullWidth
                      />
                      <Button type="submit" size="large" disabled={submitting}>
                        {submitting ? 'Sending...' : 'Post review'}
                      </Button>
                    </Stack>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

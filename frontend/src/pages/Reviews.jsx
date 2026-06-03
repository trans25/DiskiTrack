import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Alert,
  Snackbar,
  CircularProgress,
  Rating,
} from '@mui/material';
import RateReviewIcon from '@mui/icons-material/RateReview';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import DeleteIcon from '@mui/icons-material/Delete';
import { api } from '../api/client.js';

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    setLoading(true);
    api
      .get('/reviews/all')
      .then((res) => setReviews(res.data.reviews || []))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load reviews'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const setPublished = async (review, isPublished) => {
    setBusyId(review.id);
    setError('');
    try {
      await api.patch(`/reviews/${review.id}/publish`, { isPublished });
      setToast(isPublished ? 'Review published.' : 'Review hidden.');
      setReviews((list) =>
        list.map((r) => (r.id === review.id ? { ...r, is_published: isPublished } : r))
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update review');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (review) => {
    setBusyId(review.id);
    setError('');
    try {
      await api.delete(`/reviews/${review.id}`);
      setToast('Review deleted.');
      setReviews((list) => list.filter((r) => r.id !== review.id));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete review');
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = reviews.filter((r) => !r.is_published).length;

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
        <RateReviewIcon color="primary" fontSize="large" />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Reviews
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Approve reviews to show them on the landing page, or hide and delete them.
          </Typography>
        </Box>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ my: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card sx={{ mt: 2 }}>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : reviews.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
              <CheckCircleIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
              <Typography>No reviews have been submitted yet.</Typography>
            </Box>
          ) : (
            <>
              {pendingCount > 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  {pendingCount} review{pendingCount === 1 ? '' : 's'} waiting for approval.
                </Alert>
              )}
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Reviewer</TableCell>
                    <TableCell>Rating</TableCell>
                    <TableCell>Comment</TableCell>
                    <TableCell>Submitted</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reviews.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell>
                        <Typography fontWeight={600}>{r.name}</Typography>
                        {r.role && (
                          <Typography variant="caption" color="text.secondary">
                            {r.role}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Rating value={r.rating} size="small" readOnly />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 320 }}>
                        <Typography variant="body2" color="text.secondary">
                          {r.comment}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatDate(r.created_at)}</TableCell>
                      <TableCell>
                        {r.is_published ? (
                          <Chip label="Published" color="success" size="small" />
                        ) : (
                          <Chip label="Pending" color="warning" size="small" />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          {r.is_published ? (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<VisibilityOffIcon />}
                              disabled={busyId === r.id}
                              onClick={() => setPublished(r, false)}
                            >
                              Hide
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              color="success"
                              variant="contained"
                              startIcon={<CheckCircleIcon />}
                              disabled={busyId === r.id}
                              onClick={() => setPublished(r, true)}
                            >
                              Approve
                            </Button>
                          )}
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            startIcon={<DeleteIcon />}
                            disabled={busyId === r.id}
                            onClick={() => remove(r)}
                          >
                            Delete
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3000}
        onClose={() => setToast('')}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}

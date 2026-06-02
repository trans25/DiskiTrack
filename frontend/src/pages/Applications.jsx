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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  CircularProgress,
  Avatar,
} from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { api } from '../api/client.js';

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export default function Applications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [busyId, setBusyId] = useState(null);

  const [proof, setProof] = useState(null); // { open, club, document, filename, loading }
  const [reject, setReject] = useState(null); // { open, club, reason }

  const load = () => {
    setLoading(true);
    api
      .get('/clubs/pending')
      .then((res) => setApps(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load applications'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleApprove = async (club) => {
    setBusyId(club.id);
    setError('');
    try {
      await api.post(`/clubs/${club.id}/approve`);
      setToast(`${club.name} approved — the admin can now sign in.`);
      setApps((a) => a.filter((x) => x.id !== club.id));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve');
    } finally {
      setBusyId(null);
    }
  };

  const openProof = async (club) => {
    setProof({ open: true, club, loading: true });
    try {
      const { data } = await api.get(`/clubs/${club.id}/proof`);
      setProof({
        open: true,
        club,
        loading: false,
        document: data.proofDocument,
        filename: data.proofFilename,
      });
    } catch (err) {
      setProof(null);
      setError(err.response?.data?.error || 'Failed to load proof document');
    }
  };

  const submitReject = async () => {
    const { club, reason } = reject;
    setBusyId(club.id);
    setError('');
    try {
      await api.post(`/clubs/${club.id}/reject`, { reason });
      setToast(`${club.name} was rejected and notified.`);
      setApps((a) => a.filter((x) => x.id !== club.id));
      setReject(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject');
    } finally {
      setBusyId(null);
    }
  };

  const isPdf = proof?.document?.startsWith('data:application/pdf');

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
        <VerifiedUserIcon color="primary" fontSize="large" />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Club applications
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review proof of representation and approve or reject new clubs.
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
          ) : apps.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
              <CheckCircleIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
              <Typography>No pending applications. You&apos;re all caught up!</Typography>
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Club</TableCell>
                  <TableCell>Applicant</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {apps.map((club) => (
                  <TableRow key={club.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
                          {club.name?.[0]}
                        </Avatar>
                        <Box>
                          <Typography fontWeight={600}>{club.name}</Typography>
                          <Chip label="Pending" color="warning" size="small" sx={{ mt: 0.5 }} />
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {club.applicant?.firstName} {club.applicant?.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {club.applicant?.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {[club.city, club.country].filter(Boolean).join(', ') || '—'}
                    </TableCell>
                    <TableCell>{formatDate(club.createdAt)}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<VisibilityIcon />}
                          onClick={() => openProof(club)}
                        >
                          Proof
                        </Button>
                        <Button
                          size="small"
                          color="success"
                          variant="contained"
                          startIcon={<CheckCircleIcon />}
                          disabled={busyId === club.id}
                          onClick={() => handleApprove(club)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          startIcon={<CancelIcon />}
                          disabled={busyId === club.id}
                          onClick={() => setReject({ open: true, club, reason: '' })}
                        >
                          Reject
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Proof viewer */}
      <Dialog open={!!proof?.open} onClose={() => setProof(null)} maxWidth="md" fullWidth>
        <DialogTitle>Proof of representation — {proof?.club?.name}</DialogTitle>
        <DialogContent dividers>
          {proof?.loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : !proof?.document ? (
            <Typography color="text.secondary">No document was uploaded.</Typography>
          ) : isPdf ? (
            <Box
              component="iframe"
              title="Proof document"
              src={proof.document}
              sx={{ width: '100%', height: '70vh', border: 'none' }}
            />
          ) : (
            <Box
              component="img"
              alt="Proof document"
              src={proof.document}
              sx={{ maxWidth: '100%', display: 'block', mx: 'auto' }}
            />
          )}
        </DialogContent>
        <DialogActions>
          {proof?.document && (
            <Button
              component="a"
              href={proof.document}
              download={proof.filename || 'proof'}
            >
              Download
            </Button>
          )}
          <Button onClick={() => setProof(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!reject?.open} onClose={() => setReject(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject {reject?.club?.name}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            The applicant will be emailed. Optionally include a reason so they know
            why and what to do next.
          </Typography>
          <TextField
            label="Reason (optional)"
            multiline
            minRows={3}
            fullWidth
            value={reject?.reason || ''}
            onChange={(e) => setReject((r) => ({ ...r, reason: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReject(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={busyId === reject?.club?.id}
            onClick={submitReject}
          >
            Reject application
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={5000}
        onClose={() => setToast('')}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}

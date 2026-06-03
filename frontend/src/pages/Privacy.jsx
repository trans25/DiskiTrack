import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Alert,
  TextField,
  MenuItem,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { api } from '../api/client.js';

export default function Privacy() {
  const [requests, setRequests] = useState([]);
  const [type, setType] = useState('EXPORT');
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    api
      .get('/privacy/requests/me')
      .then((res) => setRequests(res.data))
      .catch(() => setRequests([]));
  };

  useEffect(load, []);

  const exportData = () => {
    setError('');
    api
      .get('/privacy/export')
      .then((res) => {
        const blob = new Blob([JSON.stringify(res.data, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'diskitrack-my-data.json';
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => setError('Could not export your data right now.'));
  };

  const submitRequest = () => {
    setError('');
    setMsg('');
    api
      .post('/privacy/requests', { requestType: type, notes })
      .then(() => {
        setMsg('Your request has been submitted to your club administrator.');
        setNotes('');
        load();
      })
      .catch((e) =>
        setError(e.response?.data?.message || 'Could not submit your request.')
      );
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} gutterBottom>
        Privacy & Your Data
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        DiskiTrack complies with POPIA and GDPR. You can download a copy of your
        data or request that it be deleted at any time.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {msg && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {msg}
        </Alert>
      )}

      <Stack spacing={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Download my data
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Get a JSON copy of your account, consent history, notifications and
              activity.
            </Typography>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={exportData}
            >
              Export my data
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Raise a data request
            </Typography>
            <Stack spacing={2} sx={{ maxWidth: 520 }}>
              <TextField
                select
                label="Request type"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <MenuItem value="EXPORT">Formal data export</MenuItem>
                <MenuItem value="DELETE">Delete my data (right to be forgotten)</MenuItem>
              </TextField>
              <TextField
                label="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                multiline
                minRows={2}
              />
              <Box>
                <Button variant="outlined" onClick={submitRequest}>
                  Submit request
                </Button>
              </Box>
            </Stack>

            {requests.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>
                  My requests
                </Typography>
                <List dense>
                  {requests.map((r) => (
                    <ListItem
                      key={r.id}
                      divider
                      secondaryAction={
                        <Chip
                          size="small"
                          label={r.status}
                          color={
                            r.status === 'COMPLETED'
                              ? 'success'
                              : r.status === 'REJECTED'
                                ? 'error'
                                : 'warning'
                          }
                        />
                      }
                    >
                      <ListItemText
                        primary={r.request_type}
                        secondary={new Date(r.created_at).toLocaleString()}
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}

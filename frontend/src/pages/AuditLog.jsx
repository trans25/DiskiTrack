import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  TextField,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { api } from '../api/client.js';

const ACTIONS = [
  'ALL',
  'LOGIN_SUCCESS',
  'LOGIN_FAILURE',
  'PLAYER_CREATE',
  'SUBSCRIPTION_CHANGE',
  'DATA_EXPORT',
  'DATA_REQUEST_CREATED',
  'CONSENT_RECORDED',
];

export default function AuditLog() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('ALL');

  const load = () => {
    setLoading(true);
    const params = action !== 'ALL' ? { action } : {};
    api
      .get('/audit', { params })
      .then((res) => setRows(res.data))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [action]);

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} gutterBottom>
        Audit Log
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        A record of important actions taken in your club for accountability and
        safeguarding.
      </Typography>

      <TextField
        select
        size="small"
        label="Filter action"
        value={action}
        onChange={(e) => setAction(e.target.value)}
        sx={{ mb: 2, minWidth: 240 }}
      >
        {ACTIONS.map((a) => (
          <MenuItem key={a} value={a}>
            {a}
          </MenuItem>
        ))}
      </TextField>

      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>When</TableCell>
                    <TableCell>Actor</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Summary</TableCell>
                    <TableCell>IP</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                      <TableCell>{r.actor_email || '—'}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={r.action}
                          color={r.action === 'LOGIN_FAILURE' ? 'error' : 'default'}
                        />
                      </TableCell>
                      <TableCell>{r.summary || '—'}</TableCell>
                      <TableCell>{r.ip_address || '—'}</TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                          No audit entries yet.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

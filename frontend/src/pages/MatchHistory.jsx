import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';
import { api } from '../api/client.js';

export default function MatchHistory() {
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    api.get('/matches?status=FINISHED').then((res) => setMatches(res.data));
  }, []);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2}>
        Match History
      </Typography>
      <Card>
        <CardContent sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Home</TableCell>
                <TableCell align="center">Score</TableCell>
                <TableCell>Away</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {matches.map((m) => (
                <TableRow key={m.id} hover>
                  <TableCell>{new Date(m.scheduledAt).toLocaleDateString()}</TableCell>
                  <TableCell>{m.homeTeamName}</TableCell>
                  <TableCell align="center">
                    <Chip label={`${m.homeScore} - ${m.awayScore}`} color="primary" size="small" />
                  </TableCell>
                  <TableCell>{m.awayTeamName}</TableCell>
                </TableRow>
              ))}
              {matches.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Stack alignItems="center" py={2}>
                      <Typography variant="body2" color="text.secondary">
                        No finished matches yet.
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
}

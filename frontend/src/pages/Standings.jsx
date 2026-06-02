import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Chip,
  TextField,
  MenuItem,
  Stack,
  CircularProgress,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { api } from '../api/client.js';

const formCell = { fontWeight: 700, textAlign: 'center' };

export default function Standings() {
  const [rows, setRows] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/teams').then((res) => setTeams(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .get('/standings', { params: teamId ? { teamId } : {} })
      .then((res) => setRows(res.data))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [teamId]);

  const leader = useMemo(() => rows[0], [rows]);

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            Log Standings
          </Typography>
          <Typography color="text.secondary">
            League table built from your club&apos;s completed matches.
          </Typography>
        </Box>
        <TextField
          select
          size="small"
          label="Filter by team"
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">All matches</MenuItem>
          {teams.map((t) => (
            <MenuItem key={t.id} value={t.id}>
              {t.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Card sx={{ borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : rows.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography color="text.secondary">
                No completed matches yet. The log updates once matches are finished.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, color: 'text.secondary' } }}>
                    <TableCell sx={{ width: 48 }}>#</TableCell>
                    <TableCell>Team</TableCell>
                    <TableCell align="center">P</TableCell>
                    <TableCell align="center">W</TableCell>
                    <TableCell align="center">D</TableCell>
                    <TableCell align="center">L</TableCell>
                    <TableCell align="center">GF</TableCell>
                    <TableCell align="center">GA</TableCell>
                    <TableCell align="center">GD</TableCell>
                    <TableCell align="center" sx={{ pr: 3 }}>Pts</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow
                      key={r.key}
                      hover
                      sx={{
                        bgcolor: r.isInternal ? 'rgba(25,118,210,0.06)' : 'inherit',
                      }}
                    >
                      <TableCell>
                        {r.position === 1 ? (
                          <EmojiEventsIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
                        ) : (
                          r.position
                        )}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar
                            src={r.logoUrl || undefined}
                            sx={{ width: 28, height: 28, bgcolor: 'primary.light', fontSize: 13 }}
                          >
                            {r.name?.[0]}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {r.name}
                            </Typography>
                            {r.isInternal && (
                              <Chip
                                label="Your team"
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ height: 18, fontSize: 10 }}
                              />
                            )}
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell align="center">{r.played}</TableCell>
                      <TableCell align="center">{r.won}</TableCell>
                      <TableCell align="center">{r.drawn}</TableCell>
                      <TableCell align="center">{r.lost}</TableCell>
                      <TableCell align="center">{r.goalsFor}</TableCell>
                      <TableCell align="center">{r.goalsAgainst}</TableCell>
                      <TableCell align="center">
                        {r.goalDifference > 0 ? `+${r.goalDifference}` : r.goalDifference}
                      </TableCell>
                      <TableCell align="center" sx={{ ...formCell, pr: 3, color: 'primary.main' }}>
                        {r.points}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {leader && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          Sorted by points, then goal difference, then goals scored. Win = 3 pts, Draw = 1 pt.
        </Typography>
      )}
    </Box>
  );
}

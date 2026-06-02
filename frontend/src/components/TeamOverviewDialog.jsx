import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
  Stack,
  Avatar,
  Typography,
  Chip,
  Divider,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import { api } from '../api/client.js';
import PlayerStatsDialog from './PlayerStatsDialog.jsx';

const ROLE_LABELS = {
  CLUB_ADMIN: 'Club Admin',
  COACH: 'Coach',
  ANALYST: 'Analyst',
};

const StatTile = ({ label, value, color = 'primary.main' }) => (
  <Grid item xs={4} sm={2}>
    <Card variant="outlined" sx={{ bgcolor: 'background.default', textAlign: 'center' }}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="h6" fontWeight={700} sx={{ color }}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
      </CardContent>
    </Card>
  </Grid>
);

const FormBadge = ({ result }) => {
  const colors = {
    W: { bg: '#16a34a', label: 'W' },
    D: { bg: '#94a3b8', label: 'D' },
    L: { bg: '#dc2626', label: 'L' },
  };
  const c = colors[result] || colors.D;
  return (
    <Box
      sx={{
        width: 28,
        height: 28,
        borderRadius: 1.5,
        bgcolor: c.bg,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: '0.8rem',
      }}
    >
      {c.label}
    </Box>
  );
};

export default function TeamOverviewDialog({ teamId, open, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(0);
  const [statsPlayerId, setStatsPlayerId] = useState(null);

  useEffect(() => {
    if (!open || !teamId) return;
    setLoading(true);
    setTab(0);
    api
      .get(`/teams/${teamId}/overview`)
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [teamId, open]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      {loading || !data ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
          {loading ? <CircularProgress /> : <Typography>No data.</Typography>}
        </Box>
      ) : (
        <>
          <DialogTitle sx={{ pb: 1 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar
                variant="rounded"
                src={data.team.logoUrl || data.team.clubLogoUrl || undefined}
                sx={{ bgcolor: 'primary.main', width: 44, height: 44, borderRadius: 2.5 }}
              >
                <GroupsIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                  {data.team.name}
                </Typography>
                <Stack direction="row" spacing={1} mt={0.5}>
                  <Chip label={data.team.ageGroup} color="primary" size="small" />
                  <Chip label={data.team.category} variant="outlined" size="small" />
                  <Chip label={data.team.clubName} variant="outlined" size="small" />
                </Stack>
              </Box>
            </Stack>
          </DialogTitle>

          <DialogContent dividers>
            {/* Summary header: record + form */}
            <Grid container spacing={2} sx={{ mb: 1 }}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="overline" color="text.secondary">
                      Squad
                    </Typography>
                    <Stack direction="row" spacing={3} mt={0.5}>
                      <Box>
                        <Typography variant="h5" fontWeight={700}>
                          {data.counts.players}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Players
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="h5" fontWeight={700}>
                          {data.counts.activePlayers}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Active
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="h5" fontWeight={700}>
                          {data.counts.staff}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Staff
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="overline" color="text.secondary">
                      Recent form
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                      {data.form.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          No matches played yet.
                        </Typography>
                      ) : (
                        <>
                          {data.form
                            .slice()
                            .reverse()
                            .map((f) => (
                              <FormBadge key={f.matchId} result={f.result} />
                            ))}
                          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                            {data.record.wins}W · {data.record.draws}D · {data.record.losses}L
                          </Typography>
                        </>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Team stat tiles */}
            <Typography variant="overline" color="text.secondary">
              Team stats
            </Typography>
            <Grid container spacing={1.5} sx={{ mb: 2, mt: 0 }}>
              <StatTile label="Goals" value={data.totals.goals} />
              <StatTile label="Assists" value={data.totals.assists} />
              <StatTile label="Shots" value={data.totals.shots} />
              <StatTile label="Fouls" value={data.totals.fouls} color="#b45309" />
              <StatTile label="Yellow" value={data.totals.yellowCards} color="#ca8a04" />
              <StatTile label="Red" value={data.totals.redCards} color="#dc2626" />
            </Grid>

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
              <Tab label={`Players (${data.players.length})`} />
              <Tab label={`Staff (${data.staff.length})`} />
            </Tabs>

            {tab === 0 &&
              (data.players.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No players in this team yet.
                </Typography>
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Tip: click a player to see their full stats, charts and graphs.
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell>Player</TableCell>
                        <TableCell>Position</TableCell>
                        <TableCell align="center">Age</TableCell>
                        <TableCell align="center">MP</TableCell>
                        <TableCell align="center">Goals</TableCell>
                        <TableCell align="center">Assists</TableCell>
                        <TableCell align="center">Shots</TableCell>
                        <TableCell align="center">Y</TableCell>
                        <TableCell align="center">R</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.players.map((p) => (
                        <TableRow
                          key={p.id}
                          hover
                          onClick={() => setStatsPlayerId(p.id)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell>{p.jerseyNumber ?? '-'}</TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Avatar
                                src={p.photoUrl || undefined}
                                sx={{ width: 32, height: 32, fontSize: '0.8rem' }}
                              >
                                {p.firstName?.[0]}
                                {p.lastName?.[0]}
                              </Avatar>
                              <Typography variant="body2" fontWeight={600}>
                                {p.firstName} {p.lastName}
                              </Typography>
                              {!p.isActive && (
                                <Chip label="Inactive" size="small" variant="outlined" />
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell>{p.position || '-'}</TableCell>
                          <TableCell align="center">{p.age ?? '-'}</TableCell>
                          <TableCell align="center">{p.stats.matchesPlayed}</TableCell>
                          <TableCell align="center">{p.stats.goals}</TableCell>
                          <TableCell align="center">{p.stats.assists}</TableCell>
                          <TableCell align="center">{p.stats.shots}</TableCell>
                          <TableCell align="center">{p.stats.yellowCards}</TableCell>
                          <TableCell align="center">{p.stats.redCards}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              ))}

            {tab === 1 &&
              (data.staff.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No staff assigned to this club yet.
                </Typography>
              ) : (
                <Grid container spacing={1.5}>
                  {data.staff.map((s) => (
                    <Grid item xs={12} sm={6} md={4} key={s.id}>
                      <Card variant="outlined" sx={{ bgcolor: 'background.default' }}>
                        <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.dark' }}>
                              {s.firstName?.[0]}
                              {s.lastName?.[0]}
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="subtitle2" fontWeight={700} noWrap>
                                {s.firstName} {s.lastName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {s.email}
                              </Typography>
                            </Box>
                          </Stack>
                          <Stack direction="row" spacing={0.75} mt={1}>
                            <Chip
                              label={ROLE_LABELS[s.role] || s.role}
                              size="small"
                              color={s.role === 'COACH' ? 'primary' : 'default'}
                            />
                            {s.isTeamCoach && (
                              <Chip
                                icon={<SportsSoccerIcon />}
                                label="Team Coach"
                                size="small"
                                color="success"
                              />
                            )}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ))}
          </DialogContent>
          <DialogActions>
            <Button variant="text" onClick={onClose}>
              Close
            </Button>
          </DialogActions>

          <PlayerStatsDialog
            playerId={statsPlayerId}
            open={Boolean(statsPlayerId)}
            onClose={() => setStatsPlayerId(null)}
          />
        </>
      )}
    </Dialog>
  );
}

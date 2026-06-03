import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Stack,
  Typography,
  Chip,
  Divider,
} from '@mui/material';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import TimerIcon from '@mui/icons-material/Timer';
import StyleIcon from '@mui/icons-material/Style';
import StadiumIcon from '@mui/icons-material/Stadium';
import { api } from '../api/client.js';
import PlayerCard from './PlayerCard.jsx';
import { contractLabel, contractColor } from '../utils/football.js';

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—';

// A single season stat tile (personal numbers only).
const StatTile = ({ icon, label, value, accent = 'primary.main' }) => (
  <Grid item xs={6} sm={4} md={2}>
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
        <Box sx={{ color: accent, display: 'flex', justifyContent: 'center', mb: 0.5 }}>
          {icon}
        </Box>
        <Typography variant="h4" fontWeight={800} lineHeight={1.1}>
          {value ?? 0}
        </Typography>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          {label}
        </Typography>
      </CardContent>
    </Card>
  </Grid>
);

/**
 * Personal player hub — shows ONLY this player's own card, season stats,
 * contract and recent matches. Reused by the player self-service dashboard and
 * the guardian dashboard (per selected child).
 *
 * Props:
 *   player        — the player record ({ id, firstName, position, ... })
 *   matchesPath   — optional API path returning this player's match rows.
 *                   Defaults to the public profile endpoint (per-match trend).
 */
export default function PlayerHub({ player, matchesPath }) {
  const [stats, setStats] = useState(null);
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    if (!player?.id) return;
    let active = true;

    // Career/season totals for THIS player only.
    api
      .get(`/players/${player.id}/profile`)
      .then((res) => {
        if (!active) return;
        setStats(res.data.totals);
        // perMatch is chronological; show the most recent first.
        const recent = [...(res.data.perMatch || [])].reverse().slice(0, 6);
        setMatches(recent);
      })
      .catch(() => {
        if (active) {
          setStats(null);
          setMatches([]);
        }
      });

    return () => {
      active = false;
    };
  }, [player?.id, matchesPath]);

  if (!player) return null;

  const cc = contractColor(player.contract);

  return (
    <Box>
      {/* Hero: the player's card next to their identity. */}
      <Card sx={{ mb: 2, overflow: 'hidden' }}>
        <Box
          sx={{
            backgroundImage:
              'linear-gradient(135deg, rgba(21,101,192,0.12), rgba(21,101,192,0.02))',
          }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={3}
              alignItems={{ xs: 'center', sm: 'flex-start' }}
            >
              <PlayerCard player={player} width={200} />
              <Box sx={{ pt: { sm: 1 }, textAlign: { xs: 'center', sm: 'left' } }}>
                <Typography variant="h4" fontWeight={800} lineHeight={1.1}>
                  {player.firstName} {player.lastName}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                  {player.position || 'Position N/A'}
                  {player.jerseyNumber != null ? ` · #${player.jerseyNumber}` : ''}
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  flexWrap="wrap"
                  useFlexGap
                  justifyContent={{ xs: 'center', sm: 'flex-start' }}
                  sx={{ mt: 1 }}
                >
                  {player.teamName && (
                    <Chip size="small" icon={<EmojiEventsIcon />} label={player.teamName} />
                  )}
                  {player.ageGroup && (
                    <Chip size="small" variant="outlined" label={player.ageGroup} />
                  )}
                  {player.age != null && (
                    <Chip size="small" variant="outlined" label={`Age ${player.age}`} />
                  )}
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Box>
      </Card>

      {/* Season stats — personal numbers only. */}
      <Typography variant="h6" fontWeight={700} mb={1}>
        My Season
      </Typography>
      <Grid container spacing={2} mb={2}>
        <StatTile icon={<StadiumIcon />} label="Matches" value={stats?.matches_played} />
        <StatTile icon={<SportsSoccerIcon />} label="Goals" value={stats?.goals} accent="#16a34a" />
        <StatTile icon={<TrackChangesIcon />} label="Assists" value={stats?.assists} accent="#6366f1" />
        <StatTile icon={<TrackChangesIcon />} label="Shots" value={stats?.shots} />
        <StatTile icon={<TimerIcon />} label="Minutes" value={stats?.minutes_played} />
        <StatTile icon={<StyleIcon />} label="Cards" value={(stats?.yellow_cards || 0) + (stats?.red_cards || 0)} accent="#d97706" />
      </Grid>

      <Grid container spacing={2}>
        {/* Contract panel. */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Contract
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip
                  label={contractLabel(player.contract)}
                  sx={{ bgcolor: cc.bg, color: cc.fg, fontWeight: 700 }}
                />
                {player.contractRenewals > 0 && (
                  <Chip
                    size="small"
                    color="success"
                    variant="outlined"
                    label={
                      player.contractRenewals > 1
                        ? `Renewed ×${player.contractRenewals}`
                        : 'Renewed'
                    }
                  />
                )}
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                Signed {fmtDate(player.contractStart)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Expires {fmtDate(player.contractEnd)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent matches — this player's appearances only. */}
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Recent Matches
              </Typography>
              {matches.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No match appearances recorded yet.
                </Typography>
              ) : (
                <Stack divider={<Divider flexItem />} spacing={1}>
                  {matches.map((m) => (
                    <Stack
                      key={m.matchId}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {m.opponent ? `vs ${m.opponent}` : m.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {fmtDate(m.date)} · {m.minutesPlayed ?? 0} min
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={0.75}>
                        {m.goals > 0 && (
                          <Chip size="small" color="success" label={`${m.goals} G`} />
                        )}
                        {m.assists > 0 && (
                          <Chip size="small" color="primary" label={`${m.assists} A`} />
                        )}
                        {!m.goals && !m.assists && (
                          <Chip size="small" variant="outlined" label="Played" />
                        )}
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

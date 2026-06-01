import { Box, Typography, Avatar } from '@mui/material';

// Relative pitch coordinates (x%, y%) per line, attacking upward.
// y grows from goalkeeper (bottom) to forwards (top).
export const FORMATIONS = {
  '4-4-2': [
    [[50, 92]], // GK
    [[15, 72], [38, 76], [62, 76], [85, 72]], // DEF
    [[15, 48], [38, 50], [62, 50], [85, 48]], // MID
    [[38, 24], [62, 24]], // FWD
  ],
  '4-3-3': [
    [[50, 92]],
    [[15, 72], [38, 76], [62, 76], [85, 72]],
    [[28, 52], [50, 54], [72, 52]],
    [[20, 26], [50, 22], [80, 26]],
  ],
  '4-2-3-1': [
    [[50, 92]],
    [[15, 72], [38, 76], [62, 76], [85, 72]],
    [[36, 58], [64, 58]],
    [[18, 38], [50, 38], [82, 38]],
    [[50, 20]],
  ],
  '3-5-2': [
    [[50, 92]],
    [[28, 74], [50, 76], [72, 74]],
    [[12, 52], [33, 54], [50, 56], [67, 54], [88, 52]],
    [[38, 26], [62, 26]],
  ],
  '4-1-4-1': [
    [[50, 92]],
    [[15, 72], [38, 76], [62, 76], [85, 72]],
    [[50, 60]],
    [[15, 42], [38, 44], [62, 44], [85, 42]],
    [[50, 22]],
  ],
  '5-3-2': [
    [[50, 92]],
    [[10, 70], [30, 74], [50, 76], [70, 74], [90, 70]],
    [[28, 50], [50, 52], [72, 50]],
    [[38, 26], [62, 26]],
  ],
};

export const FORMATION_NAMES = Object.keys(FORMATIONS);

// Flatten a formation's lines into ordered [x, y] slots for the 11 starters.
export function formationSlots(formation) {
  const lines = FORMATIONS[formation] || FORMATIONS['4-4-2'];
  return lines.flat();
}

const initials = (p) =>
  `${(p?.firstName || '')[0] || ''}${(p?.lastName || '')[0] || ''}`.toUpperCase();

/**
 * Professional formation pitch. `starters` is an ordered array of player
 * objects (max 11) mapped onto the formation slots top-to-bottom.
 */
export default function LineupPitch({ formation = '4-4-2', starters = [], teamName }) {
  const slots = formationSlots(formation);

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        aspectRatio: '3 / 4',
        borderRadius: 2,
        overflow: 'hidden',
        background:
          'repeating-linear-gradient(180deg, #2e7d32 0 12.5%, #338a38 12.5% 25%)',
        border: '2px solid #1b5e20',
      }}
    >
      {/* Pitch markings */}
      <Box sx={{ position: 'absolute', inset: 8, border: '2px solid rgba(255,255,255,0.6)', borderRadius: 1 }} />
      <Box sx={{ position: 'absolute', left: 8, right: 8, top: '50%', borderTop: '2px solid rgba(255,255,255,0.6)' }} />
      <Box
        sx={{
          position: 'absolute', left: '50%', top: '50%', width: 80, height: 80,
          transform: 'translate(-50%, -50%)', borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.6)',
        }}
      />
      {/* Penalty boxes */}
      <Box sx={{ position: 'absolute', left: '25%', right: '25%', top: 8, height: '14%', border: '2px solid rgba(255,255,255,0.6)', borderTop: 0 }} />
      <Box sx={{ position: 'absolute', left: '25%', right: '25%', bottom: 8, height: '14%', border: '2px solid rgba(255,255,255,0.6)', borderBottom: 0 }} />

      {teamName && (
        <Typography
          variant="caption"
          sx={{ position: 'absolute', top: 4, left: 8, color: '#fff', fontWeight: 700, textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
        >
          {teamName} · {formation}
        </Typography>
      )}

      {slots.map(([x, y], i) => {
        const p = starters[i];
        return (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              width: 64,
            }}
          >
            <Avatar
              sx={{
                width: 34,
                height: 34,
                mx: 'auto',
                bgcolor: p ? '#fff' : 'rgba(255,255,255,0.35)',
                color: 'primary.main',
                fontSize: 13,
                fontWeight: 700,
                border: '2px solid',
                borderColor: p ? 'primary.main' : 'rgba(255,255,255,0.6)',
              }}
            >
              {p?.jerseyNumber != null ? p.jerseyNumber : initials(p) || ''}
            </Avatar>
            {p && (
              <Typography
                variant="caption"
                sx={{ color: '#fff', display: 'block', lineHeight: 1.1, mt: 0.25, fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}
                noWrap
              >
                {p.lastName || p.firstName}
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

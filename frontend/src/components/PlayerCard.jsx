import { Box, Typography } from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import {
  ageGroupShort,
  contractLabel,
  contractColor,
  positionLabel,
} from '../utils/football.js';

// Position accent colors (clean, modern palette).
const POS_COLORS = {
  GK: '#0ea5e9',
  DEF: '#22c55e',
  MID: '#6366f1',
  FWD: '#f43f5e',
};

// Map any stored position code to a broad group for the accent color only.
const positionGroup = (pos = '') => {
  const p = pos.toUpperCase();
  if (p === 'GK') return 'GK';
  if (['CB', 'LB', 'RB', 'LWB', 'RWB', 'DEF', 'DF'].includes(p)) return 'DEF';
  if (['CM', 'CDM', 'CAM', 'LM', 'RM', 'MID', 'MF'].includes(p)) return 'MID';
  if (['ST', 'CF', 'LW', 'RW', 'FWD', 'FW'].includes(p)) return 'FWD';
  return 'MID';
};

// Clean, professional player roster card — real club data only.
// Props: player { id, firstName, lastName, position, jerseyNumber, photoUrl,
//                 clubLogoUrl, teamName, ageGroup, contract, contractRenewals }
export default function PlayerCard({ player, onClick, width = 200 }) {
  const accent = POS_COLORS[positionGroup(player.position)] || '#6366f1';
  const fullName = `${player.firstName || ''} ${player.lastName || ''}`.trim();
  const ageGroup = ageGroupShort(player.ageGroup);
  const contractText = contractLabel(player.contract);
  const contractC = contractColor(player.contract);
  const renewals = player.contractRenewals || 0;

  return (
    <Box
      onClick={onClick}
      sx={{
        width,
        bgcolor: '#fff',
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform .15s ease, box-shadow .15s ease, border-color .15s ease',
        boxShadow: '0 1px 2px rgba(16,24,40,0.06)',
        '&:hover': onClick
          ? {
              transform: 'translateY(-3px)',
              boxShadow: '0 12px 24px rgba(16,24,40,0.14)',
              borderColor: accent,
            }
          : undefined,
      }}
    >
      {/* Header band with accent + crest + jersey number */}
      <Box
        sx={{
          position: 'relative',
          height: width * 0.34,
          background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
        }}
      >
        {player.clubLogoUrl && (
          <Box
            component="img"
            src={player.clubLogoUrl}
            alt=""
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              width: 22,
              height: 22,
              objectFit: 'contain',
              filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.25))',
            }}
          />
        )}
        {player.jerseyNumber != null && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              minWidth: 30,
              height: 30,
              px: 0.5,
              borderRadius: 1.5,
              bgcolor: '#fff',
              color: accent,
              fontWeight: 800,
              fontSize: 15,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}
          >
            {player.jerseyNumber}
          </Box>
        )}
      </Box>

      {/* Avatar overlapping the band */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: `-${width * 0.18}px` }}>
        <Box
          sx={{
            width: width * 0.36,
            height: width * 0.36,
            borderRadius: '50%',
            border: '3px solid #fff',
            boxShadow: '0 2px 8px rgba(16,24,40,0.18)',
            bgcolor: '#f1f5f9',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {player.photoUrl ? (
            <Box
              component="img"
              src={player.photoUrl}
              alt={fullName}
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Typography sx={{ fontWeight: 800, fontSize: width * 0.14, color: accent }}>
              {(player.firstName?.[0] || '?')}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Name + meta */}
      <Box sx={{ textAlign: 'center', px: 1.5, pt: 1, pb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            minWidth: 0,
          }}
        >
          <Typography sx={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }} noWrap>
            {fullName || '—'}
          </Typography>
          {ageGroup && (
            <Box
              component="span"
              sx={{
                flexShrink: 0,
                px: 0.6,
                py: 0.1,
                borderRadius: 1,
                bgcolor: 'rgba(15,23,42,0.06)',
                color: 'text.secondary',
                fontWeight: 700,
                fontSize: 10,
                letterSpacing: 0.3,
              }}
            >
              {ageGroup}
            </Box>
          )}
        </Box>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
          <Box
            component="span"
            title={positionLabel(player.position)}
            sx={{
              px: 1,
              py: 0.2,
              borderRadius: 1,
              bgcolor: `${accent}1a`,
              color: accent,
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: 0.5,
            }}
          >
            {player.position || 'N/A'}
          </Box>
          {player.teamName && (
            <Typography variant="caption" color="text.secondary" fontWeight={600} noWrap>
              {player.teamName}
            </Typography>
          )}
        </Box>

        {/* Contract status: years left + renewed indicator */}
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            mt: 0.8,
            px: 0.9,
            py: 0.25,
            borderRadius: 1,
            bgcolor: contractC.bg,
            color: contractC.fg,
          }}
        >
          <Typography sx={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.2 }}>
            {contractText}
          </Typography>
          {renewals > 0 && (
            <Box
              component="span"
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}
              title={`Renewed ${renewals} time${renewals === 1 ? '' : 's'}`}
            >
              <VerifiedIcon sx={{ fontSize: 12 }} />
              <Typography sx={{ fontSize: 10, fontWeight: 800 }}>
                {renewals > 1 ? `×${renewals}` : 'Renewed'}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

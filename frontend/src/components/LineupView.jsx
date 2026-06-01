import { Box, Typography, Stack, List, ListItem, ListItemText, Avatar, Divider } from '@mui/material';
import LineupPitch from './LineupPitch.jsx';

const label = (p) =>
  `${p?.jerseyNumber != null ? '#' + p.jerseyNumber + ' ' : ''}${p?.firstName ? p.firstName + ' ' : ''}${p?.lastName || ''}`.trim();

/**
 * Read-only, professional lineup sheet: a formation pitch with the starting XI,
 * plus a clearly listed substitutes bench. Used by Club Admins (view only) and
 * anywhere a saved lineup needs to be displayed.
 */
export default function LineupView({ formation = '4-4-2', teamName, starters = [], subs = [] }) {
  if (!starters.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No lineup has been set for this match yet.
      </Typography>
    );
  }

  return (
    <Stack spacing={2}>
      <LineupPitch formation={formation} starters={starters} teamName={teamName} />

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Substitutes ({subs.length})
        </Typography>
        <Divider sx={{ mb: 1 }} />
        {subs.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No substitutes named.
          </Typography>
        ) : (
          <List dense disablePadding>
            {subs.map((p) => (
              <ListItem key={p.playerId || p.id} disableGutters>
                <Avatar
                  sx={{
                    width: 28,
                    height: 28,
                    mr: 1.5,
                    bgcolor: 'background.default',
                    color: 'primary.main',
                    fontSize: 13,
                    fontWeight: 700,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  {p.jerseyNumber != null ? p.jerseyNumber : (p.lastName || '?')[0]}
                </Avatar>
                <ListItemText
                  primary={label(p)}
                  secondary={p.position || 'Substitute'}
                  primaryTypographyProps={{ fontWeight: 600, variant: 'body2' }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Stack>
  );
}

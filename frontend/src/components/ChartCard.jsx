import { Card, CardContent, Box, Typography, Stack } from '@mui/material';

/**
 * Standard analytics chart wrapper. Keeps every chart on the page a uniform
 * height and gives an optional hint that the chart is interactive.
 */
export default function ChartCard({ title, subtitle, height = 300, action, children }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {action}
        </Stack>
        <Box sx={{ width: '100%', height }}>{children}</Box>
      </CardContent>
    </Card>
  );
}

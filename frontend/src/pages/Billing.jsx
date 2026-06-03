import { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Alert,
  CircularProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { api } from '../api/client.js';

const money = (cents, currency = 'ZAR') =>
  cents === 0
    ? 'Free'
    : new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(
        cents / 100
      );

export default function Billing() {
  const [plans, setPlans] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [invoices, setInvoices] = useState([]);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/billing/plans'),
      api.get('/billing/subscription'),
      api.get('/billing/invoices').catch(() => ({ data: [] })),
    ])
      .then(([p, s, i]) => {
        setPlans(p.data);
        setData(s.data);
        setInvoices(i.data);
      })
      .catch(() => setError('Could not load billing information.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const subscribe = (planCode) => {
    setBusy(planCode);
    setError('');
    api
      .post('/billing/subscribe', { planCode })
      .then((res) => {
        if (res.data.redirectUrl) {
          window.location.href = res.data.redirectUrl;
          return;
        }
        load();
      })
      .catch((e) =>
        setError(e.response?.data?.message || 'Could not update subscription.')
      )
      .finally(() => setBusy(''));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  const currentCode = data?.subscription?.plan?.code;
  const usage = data?.usage || { teams: 0, players: 0 };

  const usageBar = (label, used, max) => (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {used} / {max ?? '∞'}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={max ? Math.min(100, (used / max) * 100) : 8}
        sx={{ height: 8, borderRadius: 4 }}
      />
    </Box>
  );

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} gutterBottom>
        Billing & Subscription
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Manage your club's plan. Limits are enforced as you add teams and players.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {data?.subscription && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              spacing={2}
            >
              <Box>
                <Typography variant="overline" color="text.secondary">
                  Current plan
                </Typography>
                <Typography variant="h5" fontWeight={800}>
                  {data.subscription.plan.name}{' '}
                  <Chip
                    size="small"
                    label={data.subscription.status}
                    color={
                      data.subscription.status === 'ACTIVE' ? 'success' : 'default'
                    }
                  />
                </Typography>
              </Box>
              <Box sx={{ minWidth: 240 }}>
                {usageBar('Teams', usage.teams, data.subscription.plan.maxTeams)}
                {usageBar('Players', usage.players, data.subscription.plan.maxPlayers)}
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={2}>
        {plans.map((plan) => {
          const isCurrent = plan.code === currentCode;
          return (
            <Grid item xs={12} sm={6} md={3} key={plan.code}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  border: isCurrent ? '2px solid' : '1px solid',
                  borderColor: isCurrent ? 'primary.main' : 'divider',
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" fontWeight={800}>
                    {plan.name}
                  </Typography>
                  <Typography variant="h4" fontWeight={800} sx={{ my: 1 }}>
                    {money(plan.priceCents, plan.currency)}
                    {plan.priceCents > 0 && (
                      <Typography component="span" variant="body2" color="text.secondary">
                        {' '}/mo
                      </Typography>
                    )}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <List dense disablePadding>
                    {(plan.features || []).map((f) => (
                      <ListItem key={f} disableGutters sx={{ py: 0.25 }}>
                        <ListItemIcon sx={{ minWidth: 28 }}>
                          <CheckCircleIcon color="primary" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primaryTypographyProps={{ variant: 'body2' }}
                          primary={f}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
                <Box sx={{ p: 2, pt: 0 }}>
                  <Button
                    fullWidth
                    variant={isCurrent ? 'outlined' : 'contained'}
                    disabled={isCurrent || busy === plan.code}
                    onClick={() => subscribe(plan.code)}
                  >
                    {isCurrent
                      ? 'Current plan'
                      : busy === plan.code
                        ? 'Processing…'
                        : 'Choose plan'}
                  </Button>
                </Box>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {invoices.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Invoice history
            </Typography>
            <List dense>
              {invoices.map((inv) => (
                <ListItem
                  key={inv.id}
                  divider
                  secondaryAction={
                    <Chip
                      size="small"
                      label={inv.status}
                      color={inv.status === 'PAID' ? 'success' : 'warning'}
                    />
                  }
                >
                  <ListItemText
                    primary={`${inv.planCode} — ${money(inv.amountCents, inv.currency)}`}
                    secondary={new Date(inv.issuedAt).toLocaleDateString()}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

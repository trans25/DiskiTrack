import { query } from '../db/pool.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { getGateway } from '../utils/paymentGateway.js';
import { recordAudit } from '../utils/audit.js';
import { notifyTenant } from '../utils/notify.js';

const toPlan = (row) => ({
  id: row.id,
  code: row.code,
  name: row.name,
  priceCents: row.price_cents,
  currency: row.currency,
  maxTeams: row.max_teams,
  maxPlayers: row.max_players,
  features: row.features,
  sortOrder: row.sort_order,
});

const toSubscription = (row) =>
  row && {
    id: row.id,
    status: row.status,
    provider: row.provider,
    currentPeriodEnd: row.current_period_end,
    trialEndsAt: row.trial_ends_at,
    plan: {
      code: row.plan_code,
      name: row.plan_name,
      priceCents: row.plan_price_cents,
      currency: row.plan_currency,
      maxTeams: row.plan_max_teams,
      maxPlayers: row.plan_max_players,
      features: row.plan_features,
    },
  };

// Public-ish: list the available plan catalogue.
export const listPlans = asyncHandler(async (_req, res) => {
  const { rows } = await query(
    `SELECT * FROM subscription_plans WHERE is_active = TRUE ORDER BY sort_order`
  );
  res.json(rows.map(toPlan));
});

const loadSubscription = async (tenantId) => {
  const { rows } = await query(
    `SELECT s.*, p.code AS plan_code, p.name AS plan_name,
            p.price_cents AS plan_price_cents, p.currency AS plan_currency,
            p.max_teams AS plan_max_teams, p.max_players AS plan_max_players,
            p.features AS plan_features
       FROM club_subscriptions s
       JOIN subscription_plans p ON p.id = s.plan_id
      WHERE s.tenant_id = $1
      LIMIT 1`,
    [tenantId]
  );
  return rows[0] || null;
};

// The current club's subscription + usage against plan limits.
export const getMySubscription = asyncHandler(async (req, res) => {
  if (!req.tenantId) throw ApiError.badRequest('No club context');
  const sub = await loadSubscription(req.tenantId);

  const teams = await query(
    `SELECT COUNT(*)::int AS n FROM teams WHERE tenant_id = $1`,
    [req.tenantId]
  );
  const players = await query(
    `SELECT COUNT(*)::int AS n FROM players WHERE tenant_id = $1`,
    [req.tenantId]
  );

  res.json({
    subscription: toSubscription(sub),
    usage: { teams: teams.rows[0].n, players: players.rows[0].n },
  });
});

// Change/subscribe the club to a plan. Uses the configured gateway; the manual
// gateway activates immediately so the flow works without external keys.
export const subscribe = asyncHandler(async (req, res) => {
  if (!req.tenantId) throw ApiError.badRequest('No club context');
  const { planCode } = req.body;

  const planRes = await query(
    `SELECT * FROM subscription_plans WHERE code = $1 AND is_active = TRUE`,
    [planCode]
  );
  const plan = planRes.rows[0];
  if (!plan) throw ApiError.notFound('Plan not found');

  const gateway = getGateway(process.env.BILLING_PROVIDER || 'manual');
  const checkout = await gateway.createCheckout({
    plan: toPlan(plan),
    tenantId: req.tenantId,
  });

  // If the gateway needs a redirect (real providers), hand the URL back.
  if (checkout.redirectUrl) {
    return res.json({ redirectUrl: checkout.redirectUrl });
  }

  // Manual/immediate activation: upsert the subscription and write an invoice.
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await query(
    `INSERT INTO club_subscriptions
        (tenant_id, plan_id, status, provider, provider_ref, current_period_end)
     VALUES ($1,$2,'ACTIVE',$3,$4,$5)
     ON CONFLICT (tenant_id) DO UPDATE SET
        plan_id = EXCLUDED.plan_id,
        status = 'ACTIVE',
        provider = EXCLUDED.provider,
        provider_ref = EXCLUDED.provider_ref,
        current_period_end = EXCLUDED.current_period_end`,
    [req.tenantId, plan.id, checkout.provider, checkout.providerRef, periodEnd]
  );

  if (plan.price_cents > 0) {
    await query(
      `INSERT INTO billing_invoices
          (tenant_id, plan_code, amount_cents, currency, status, provider, provider_ref)
       VALUES ($1,$2,$3,$4,'PAID',$5,$6)`,
      [
        req.tenantId,
        plan.code,
        plan.price_cents,
        plan.currency,
        checkout.provider,
        checkout.providerRef,
      ]
    );
  }

  recordAudit({
    req,
    action: 'SUBSCRIPTION_CHANGE',
    entityType: 'club',
    entityId: req.tenantId,
    summary: `Subscribed to ${plan.name} plan`,
    metadata: { planCode: plan.code },
  });

  notifyTenant({
    tenantId: req.tenantId,
    roles: ['CLUB_ADMIN'],
    type: 'BILLING',
    title: 'Subscription updated',
    body: `Your club is now on the ${plan.name} plan.`,
    link: '/billing',
  });

  const sub = await loadSubscription(req.tenantId);
  res.json({ subscription: toSubscription(sub) });
});

// Cancel — drops the club back to the FREE plan.
export const cancelSubscription = asyncHandler(async (req, res) => {
  if (!req.tenantId) throw ApiError.badRequest('No club context');
  const free = await query(
    `SELECT id FROM subscription_plans WHERE code = 'FREE'`
  );
  await query(
    `UPDATE club_subscriptions
        SET plan_id = $2, status = 'CANCELLED', provider = NULL, provider_ref = NULL
      WHERE tenant_id = $1`,
    [req.tenantId, free.rows[0].id]
  );
  recordAudit({
    req,
    action: 'SUBSCRIPTION_CANCEL',
    entityType: 'club',
    entityId: req.tenantId,
    summary: 'Cancelled subscription (reverted to Free)',
  });
  const sub = await loadSubscription(req.tenantId);
  res.json({ subscription: toSubscription(sub) });
});

// Invoice history for the club.
export const listInvoices = asyncHandler(async (req, res) => {
  if (!req.tenantId) throw ApiError.badRequest('No club context');
  const { rows } = await query(
    `SELECT * FROM billing_invoices WHERE tenant_id = $1 ORDER BY issued_at DESC LIMIT 50`,
    [req.tenantId]
  );
  res.json(
    rows.map((r) => ({
      id: r.id,
      planCode: r.plan_code,
      amountCents: r.amount_cents,
      currency: r.currency,
      status: r.status,
      issuedAt: r.issued_at,
    }))
  );
});

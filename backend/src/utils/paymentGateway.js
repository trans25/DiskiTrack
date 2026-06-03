// Pluggable payment gateway abstraction.
//
// Real providers (PayFast, Paystack, Stripe) can be slotted in here later by
// implementing the same interface and selecting via config.billing.provider.
// For now the default 'manual' gateway simulates a successful checkout so the
// subscription flow works end-to-end without external API keys.

const manualGateway = {
  name: 'manual',
  /**
   * Begin a checkout. Returns a redirect URL (or null when no redirect is
   * needed, as with the manual gateway which activates immediately).
   */
  async createCheckout({ plan, tenantId }) {
    return {
      provider: 'manual',
      redirectUrl: null,
      providerRef: `manual_${tenantId}_${Date.now()}`,
      // Manual gateway considers payment captured immediately.
      activated: true,
      plan,
    };
  },

  /** Verify a webhook/callback payload. Manual gateway always trusts it. */
  async verifyCallback() {
    return { ok: true };
  },

  /** Cancel an external subscription. No-op for manual. */
  async cancel() {
    return { ok: true };
  },
};

// Stubs for the real providers so wiring keys later is a drop-in change.
const stubGateway = (name) => ({
  name,
  async createCheckout() {
    throw new Error(
      `${name} gateway is not configured. Set the provider API keys to enable live checkout.`
    );
  },
  async verifyCallback() {
    return { ok: false };
  },
  async cancel() {
    return { ok: true };
  },
});

const gateways = {
  manual: manualGateway,
  payfast: stubGateway('payfast'),
  paystack: stubGateway('paystack'),
  stripe: stubGateway('stripe'),
};

/** Resolve the active gateway from config (defaults to manual). */
export const getGateway = (provider = 'manual') =>
  gateways[provider] || manualGateway;

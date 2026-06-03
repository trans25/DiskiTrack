import { describe, it, expect } from 'vitest';
import { getGateway } from '../src/utils/paymentGateway.js';

describe('payment gateway', () => {
  it('defaults to the manual gateway', () => {
    expect(getGateway().name).toBe('manual');
    expect(getGateway('unknown').name).toBe('manual');
  });

  it('manual gateway activates checkout immediately', async () => {
    const result = await getGateway('manual').createCheckout({
      plan: { code: 'PRO' },
      tenantId: 'club-1',
    });
    expect(result.activated).toBe(true);
    expect(result.provider).toBe('manual');
    expect(result.redirectUrl).toBeNull();
    expect(result.providerRef).toContain('manual_club-1');
  });

  it('real providers are stubbed until keys are configured', async () => {
    await expect(
      getGateway('stripe').createCheckout({ plan: {}, tenantId: 'x' })
    ).rejects.toThrow(/not configured/);
  });
});

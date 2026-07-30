import { describe, expect, it } from 'vitest';

import { buildDemoWalletCard } from './useDemoWalletCards';

describe('demo wallet card helpers', () => {
  it('projects anonymous manual-card drafts into stable demo wallet cards', () => {
    const card = buildDemoWalletCard({
      draftCard: {
        issuer: 'Chase',
        name: 'Sapphire Preferred',
        last4: '4242',
        isBusiness: false,
      },
      sequence: 3,
    });

    expect(card).toMatchObject({
      id: 'custom-3',
      issuer: 'Chase',
      name: 'Sapphire Preferred',
      last4: '4242',
      categories: ['Personal', 'Custom'],
      isBusiness: false,
    });
    expect(card.multipliers).toEqual([
      {
        id: 'custom-3-flat',
        category: 'gas',
        label: 'Custom category',
        multiplier: 'Set rate',
        detail: 'Map bonus categories after onboarding',
        icon: '⚙️',
      },
    ]);
    expect(card.transactions).toEqual([{ id: 'custom-3-setup', merchant: 'Awaiting connection', amount: '--', date: 'Now', category: 'Setup' }]);
    expect(card.benefits).toEqual([{ id: 'custom-3-benefit', title: 'Starter perk slot', status: 'available', detail: 'Add real benefits in a later build', progress: 0 }]);
  });

  it('labels business demo cards separately from personal demo cards', () => {
    const card = buildDemoWalletCard({
      draftCard: {
        issuer: 'American Express',
        name: 'Business Gold',
        last4: '9001',
        isBusiness: true,
      },
      sequence: 1,
    });

    expect(card.categories).toEqual(['Business', 'Custom']);
    expect(card.alerts).toEqual(['Business card added to the wallet prototype']);
    expect(card.isBusiness).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';

import {
  connectedAccountRemovalButtonLabel,
  connectedAccountRemovalTitle,
} from './ConnectedAccountRemovalSheet';
import type { PlaidConnectedAccount } from './types';

const baseAccount: PlaidConnectedAccount = {
  accountId: 'account-1',
  institutionName: 'Plaid Sandbox',
  name: 'Plaid Checking Name',
  mask: '1234',
  type: 'credit',
  subtype: 'credit card',
  currentBalance: 120,
  limit: 1000,
};

describe('ConnectedAccountRemovalSheet helpers', () => {
  it('prefers the matched card product name in the removal title', () => {
    expect(connectedAccountRemovalTitle({
      ...baseAccount,
      cardProductName: 'Amex Gold',
    })).toBe('Remove Amex Gold?');
  });

  it('falls back to the Plaid account name when no card product is matched', () => {
    expect(connectedAccountRemovalTitle(baseAccount)).toBe('Remove Plaid Checking Name?');
  });

  it('maps removal state to the confirmation button label', () => {
    expect(connectedAccountRemovalButtonLabel(false)).toBe('Remove');
    expect(connectedAccountRemovalButtonLabel(true)).toBe('Removing');
  });
});

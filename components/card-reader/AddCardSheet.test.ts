import { describe, expect, it } from 'vitest';

import { addCardSheetTitle, canSubmitManualCard, plaidErrorRecovery } from './AddCardSheet';

describe('AddCardSheet helpers', () => {
  it('maps scanner steps to stable modal titles', () => {
    expect(addCardSheetTitle('camera')).toBe('Scan your card');
    expect(addCardSheetTitle('manual')).toBe('Enter card details');
    expect(addCardSheetTitle('plaid')).toBe('Connect with Plaid');
    expect(addCardSheetTitle('match')).toBe('Match your card');
    expect(addCardSheetTitle('success')).toBe('Card added');
  });

  it('keeps signed-in manual cards disabled until catalog and last-four are ready', () => {
    expect(canSubmitManualCard({
      cardProductCount: 0,
      effectiveManualCardProductId: '',
      isUserBackedWallet: true,
      last4: '1234',
      manualCardStatus: 'idle',
    })).toBe(false);

    expect(canSubmitManualCard({
      cardProductCount: 1,
      effectiveManualCardProductId: 'amex-gold',
      isUserBackedWallet: true,
      last4: '123',
      manualCardStatus: 'idle',
    })).toBe(false);

    expect(canSubmitManualCard({
      cardProductCount: 1,
      effectiveManualCardProductId: 'amex-gold',
      isUserBackedWallet: true,
      last4: '1234',
      manualCardStatus: 'idle',
    })).toBe(true);
  });

  it('allows anonymous demo manual cards unless a save is already running', () => {
    expect(canSubmitManualCard({
      cardProductCount: 0,
      effectiveManualCardProductId: '',
      isUserBackedWallet: false,
      last4: '',
      manualCardStatus: 'idle',
    })).toBe(true);

    expect(canSubmitManualCard({
      cardProductCount: 0,
      effectiveManualCardProductId: '',
      isUserBackedWallet: false,
      last4: '',
      manualCardStatus: 'saving',
    })).toBe(false);
  });

  it('maps Plaid exchange failures to user recovery guidance', () => {
    expect(plaidErrorRecovery(null)).toBeNull();
    expect(plaidErrorRecovery('No credit card accounts were found for this Plaid connection.')).toEqual({
      title: 'No credit card accounts found',
      detail: 'Pick an issuer login that includes a credit card, or add the card manually if Plaid does not expose it.',
      action: 'Try another issuer or enter manually',
    });
    expect(plaidErrorRecovery('This Plaid credit card connection is already linked.')).toEqual({
      title: 'Card already linked',
      detail: 'This connection matches an active card in your wallet, so Card Reader kept the existing secure Plaid item.',
      action: 'Review connected accounts',
    });
    expect(plaidErrorRecovery('Plaid Link did not load.')).toEqual({
      title: 'Plaid connection needs attention',
      detail: 'Retry the connection. If it keeps failing, use manual entry so recommendations can still use this card.',
      action: 'Retry or enter manually',
    });
  });
});

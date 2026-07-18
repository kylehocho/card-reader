import { describe, expect, it } from 'vitest';

import { addCardSheetTitle, canSubmitManualCard } from './AddCardSheet';

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
});

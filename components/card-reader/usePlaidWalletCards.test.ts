import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildPlaidWalletCard,
  clearStoredPlaidConnection,
  getWalletDisplayAccounts,
  mergePlaidWalletCards,
  PLAID_STORAGE_KEY,
  readStoredPlaidConnection,
  selectPlaidWalletAccount,
  writeStoredPlaidConnection,
} from './usePlaidWalletCards';
import type { PlaidConnectedAccount } from './types';

const checkingAccount: PlaidConnectedAccount = {
  accountId: 'checking-1',
  institutionName: 'Plaid Bank',
  name: 'Everyday Checking',
  mask: '1111',
  type: 'depository',
  subtype: 'checking',
  currentBalance: 1200,
  limit: null,
};

const creditAccount: PlaidConnectedAccount = {
  accountId: 'credit-1',
  institutionName: 'Plaid Bank',
  name: 'Plaid Credit',
  mask: '2222',
  type: 'credit',
  subtype: 'credit card',
  currentBalance: 431.22,
  limit: 5000,
};

function installWindowStorage() {
  const values = new Map<string, string>();
  const localStorage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
  };

  vi.stubGlobal('window', { localStorage });
  return localStorage;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Plaid wallet card helpers', () => {
  it('uses credit accounts first for wallet display and falls back to one non-credit account', () => {
    expect(getWalletDisplayAccounts([checkingAccount, creditAccount])).toEqual([creditAccount]);
    expect(getWalletDisplayAccounts([checkingAccount])).toEqual([checkingAccount]);
  });

  it('projects matched Plaid accounts into wallet cards with card-product labels', () => {
    const card = buildPlaidWalletCard({
      ...creditAccount,
      cardProductId: 'amex-gold',
      cardProductName: 'Gold Card',
      cardProductIssuer: 'American Express',
      recentTransactions: [
        { id: 't1', merchant: 'Whole Foods', amount: '$42.00', date: 'Today', category: 'Groceries' },
      ],
    });

    expect(card).toMatchObject({
      id: 'plaid-credit-1',
      issuer: 'American Express',
      name: 'Gold Card',
      last4: '2222',
      pointsLabel: 'Plaid Bank',
      pointsValue: '$431',
      spendSummary: '$5,000 credit limit synced from Plaid.',
      categories: ['credit card', 'Matched card'],
      alerts: ['Sandbox connection active', 'Matched to Gold Card'],
    });
    expect(card.transactions).toEqual([{ id: 't1', merchant: 'Whole Foods', amount: '$42.00', date: 'Today', category: 'Groceries' }]);
  });

  it('resolves the Plaid account for a selected wallet card id', () => {
    expect(selectPlaidWalletAccount([checkingAccount, creditAccount], 'plaid-credit-1')).toBe(creditAccount);
    expect(selectPlaidWalletAccount([checkingAccount, creditAccount], 'amex-gold')).toBeNull();
  });

  it('replaces seed cards with Plaid wallet cards for user-backed wallets', () => {
    const result = mergePlaidWalletCards({
      accounts: [checkingAccount, creditAccount],
      buildWalletCard: (account) => ({ id: `plaid-${account.accountId}`, label: account.name }),
      currentCards: [{ id: 'amex-gold', label: 'Gold Card' }],
      isUserBackedWallet: true,
    });

    expect(result).toEqual([{ id: 'plaid-credit-1', label: 'Plaid Credit' }]);
  });

  it('keeps existing non-Plaid cards when anonymous Plaid fallback accounts are merged', () => {
    const result = mergePlaidWalletCards({
      accounts: [checkingAccount],
      buildWalletCard: (account) => ({ id: `plaid-${account.accountId}`, label: account.name }),
      currentCards: [
        { id: 'amex-gold', label: 'Gold Card' },
        { id: 'plaid-old-account', label: 'Old account' },
      ],
      isUserBackedWallet: false,
    });

    expect(result).toEqual([
      { id: 'amex-gold', label: 'Gold Card' },
      { id: 'plaid-checking-1', label: 'Everyday Checking' },
    ]);
  });

  it('sanitizes stored Plaid connections and removes bad payloads', () => {
    const storage = installWindowStorage();
    storage.setItem(
      PLAID_STORAGE_KEY,
      JSON.stringify({
        accounts: [
          checkingAccount,
          { accountId: 123, name: 'Bad account' },
        ],
      }),
    );

    expect(readStoredPlaidConnection()).toEqual({ accounts: [checkingAccount] });

    storage.setItem(PLAID_STORAGE_KEY, '{bad json');
    expect(readStoredPlaidConnection()).toBeNull();
  });

  it('writes and clears stored Plaid connections', () => {
    const storage = installWindowStorage();

    writeStoredPlaidConnection([creditAccount]);
    expect(storage.setItem).toHaveBeenCalledWith(PLAID_STORAGE_KEY, JSON.stringify({ accounts: [creditAccount] }));

    writeStoredPlaidConnection([]);
    expect(storage.removeItem).toHaveBeenCalledWith(PLAID_STORAGE_KEY);

    clearStoredPlaidConnection();
    expect(storage.removeItem).toHaveBeenCalledWith(PLAID_STORAGE_KEY);
  });
});

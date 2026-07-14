import { describe, expect, it } from 'vitest';
import type { PlaidConnectedAccount } from '@/components/card-reader/types';
import type { CardProductRow, PlaidAccountRow } from '@/components/card-reader/usePersistedPlaidData';
import {
  applyCardProductMatch,
  buildConnectedAccountsFromPlaidExchange,
  removeAccountFromList,
  removeAccountStatus,
} from './usePlaidWalletActions';

const baseAccount: PlaidConnectedAccount = {
  dbId: 'account-row-1',
  accountId: 'plaid-account-1',
  institutionName: 'Plaid Sandbox',
  name: 'Credit Card',
  mask: '1234',
  type: 'credit',
  subtype: 'credit card',
  currentBalance: 100,
  limit: 1000,
};

const product = {
  id: 'amex-gold',
  issuer: 'American Express',
  name: 'American Express Gold Card',
} satisfies Pick<CardProductRow, 'id' | 'issuer' | 'name'>;

const savedAccount: PlaidAccountRow = {
  id: 'account-row-2',
  user_id: 'user-1',
  plaid_item_id: 'item-1',
  account_id: 'saved-plaid-account-1',
  name: 'Gold Card',
  official_name: 'American Express Gold Card',
  mask: '2219',
  type: 'credit',
  subtype: 'credit card',
  current_balance: 184.2,
  available_balance: null,
  credit_limit: 10000,
  iso_currency_code: 'USD',
  created_at: '2026-07-14T00:00:00Z',
  updated_at: '2026-07-14T00:00:00Z',
};

describe('buildConnectedAccountsFromPlaidExchange', () => {
  it('uses saved account rows when the exchange persisted accounts', () => {
    const accounts = buildConnectedAccountsFromPlaidExchange(
      {
        itemId: 'item-1',
        accounts: [],
        savedAccounts: [savedAccount],
      },
      { institution: { institution_id: 'ins_1', name: 'American Express' } },
    );

    expect(accounts).toEqual([
      {
        dbId: 'account-row-2',
        accountId: 'saved-plaid-account-1',
        institutionName: 'American Express',
        name: 'American Express Gold Card',
        mask: '2219',
        type: 'credit',
        subtype: 'credit card',
        currentBalance: 184.2,
        limit: 10000,
      },
    ]);
  });

  it('filters raw Plaid exchange accounts down to credit cards', () => {
    const accounts = buildConnectedAccountsFromPlaidExchange(
      {
        itemId: 'item-1',
        accounts: [
          {
            account_id: 'credit-1',
            name: 'Sapphire Preferred',
            official_name: null,
            mask: null,
            type: 'credit',
            subtype: 'credit card',
            balances: { available: null, current: 41.2, limit: 5000, iso_currency_code: 'USD' },
          },
          {
            account_id: 'checking-1',
            name: 'Checking',
            official_name: null,
            mask: '0001',
            type: 'depository',
            subtype: 'checking',
            balances: { available: 20, current: 20, limit: null, iso_currency_code: 'USD' },
          },
        ],
      },
      { institution: null },
    );

    expect(accounts).toEqual([
      {
        accountId: 'credit-1',
        institutionName: 'Plaid Sandbox',
        name: 'Sapphire Preferred',
        mask: '0000',
        type: 'credit',
        subtype: 'credit card',
        currentBalance: 41.2,
        limit: 5000,
      },
    ]);
  });
});

describe('Plaid wallet action list helpers', () => {
  it('applies card product match fields without changing unrelated accounts', () => {
    const nextAccounts = applyCardProductMatch(
      [baseAccount, { ...baseAccount, accountId: 'plaid-account-2' }],
      baseAccount,
      product.id,
      product,
      'suggested',
    );

    expect(nextAccounts[0]).toMatchObject({
      cardProductId: 'amex-gold',
      cardProductName: 'American Express Gold Card',
      cardProductIssuer: 'American Express',
      matchStatus: 'suggested',
    });
    expect(nextAccounts[1].cardProductId).toBeUndefined();
  });

  it('removes account rows and their per-account match status', () => {
    expect(removeAccountFromList([baseAccount, { ...baseAccount, accountId: 'plaid-account-2' }], baseAccount)).toEqual([
      { ...baseAccount, accountId: 'plaid-account-2' },
    ]);
    expect(removeAccountStatus({ 'plaid-account-1': 'saved', 'plaid-account-2': 'saving' }, baseAccount)).toEqual({
      'plaid-account-2': 'saving',
    });
  });
});

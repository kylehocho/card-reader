import { describe, expect, it } from 'vitest';
import {
  accountFromPersistedRow,
  groupRecentTransactionsByAccountId,
  type PlaidAccountWithRelations,
  type PlaidTransactionRow,
} from './usePersistedPlaidData';

const baseTransaction: PlaidTransactionRow = {
  id: 'transaction-1',
  user_id: 'user-1',
  plaid_item_id: 'item-1',
  plaid_account_id: 'account-row-1',
  account_id: 'plaid-account-1',
  transaction_id: 'plaid-transaction-1',
  name: 'Whole Foods Market',
  merchant_name: 'Whole Foods',
  amount: 42.25,
  iso_currency_code: 'USD',
  date: '2026-07-12',
  authorized_date: '2026-07-12',
  pending: false,
  payment_channel: 'in store',
  category: ['Groceries'],
  category_id: null,
  personal_finance_category: null,
  created_at: '2026-07-12T00:00:00Z',
  updated_at: '2026-07-12T00:00:00Z',
};

const baseAccount: PlaidAccountWithRelations = {
  id: 'account-row-1',
  user_id: 'user-1',
  plaid_item_id: 'item-1',
  account_id: 'plaid-account-1',
  name: 'Gold Card',
  official_name: 'American Express Gold Card',
  mask: '2219',
  type: 'credit',
  subtype: 'credit card',
  current_balance: 184.2,
  available_balance: null,
  credit_limit: 10000,
  iso_currency_code: 'USD',
  created_at: '2026-07-12T00:00:00Z',
  updated_at: '2026-07-12T00:00:00Z',
  plaid_items: { institution_name: 'American Express' },
  account_card_matches: [
    {
      id: 'match-1',
      user_id: 'user-1',
      plaid_account_id: 'account-row-1',
      card_product_id: 'amex-gold',
      match_status: 'suggested',
      match_confidence: 0.92,
      created_at: '2026-07-12T00:00:00Z',
      updated_at: '2026-07-12T00:00:00Z',
      card_products: {
        id: 'amex-gold',
        issuer: 'American Express',
        name: 'American Express Gold Card',
      },
    },
  ],
};

describe('groupRecentTransactionsByAccountId', () => {
  it('groups formatted recent transactions by persisted Plaid account row id', () => {
    const grouped = groupRecentTransactionsByAccountId([
      { ...baseTransaction, id: 'transaction-1', amount: 42.25 },
      { ...baseTransaction, id: 'transaction-2', amount: 18.5, name: 'Coffee Shop', merchant_name: null, category: [] },
      { ...baseTransaction, id: 'transaction-3', plaid_account_id: null },
    ]);

    expect(grouped.get('account-row-1')).toEqual([
      { id: 'transaction-1', merchant: 'Whole Foods', amount: '$42.25', date: 'Jul 12', category: 'Groceries' },
      { id: 'transaction-2', merchant: 'Coffee Shop', amount: '$18.50', date: 'Jul 12', category: 'Transaction' },
    ]);
    expect(grouped.has('account-row-2')).toBe(false);
  });

  it('caps each account at five recent transactions', () => {
    const grouped = groupRecentTransactionsByAccountId(
      Array.from({ length: 7 }, (_, index) => ({
        ...baseTransaction,
        id: `transaction-${index + 1}`,
        transaction_id: `plaid-transaction-${index + 1}`,
      })),
    );

    expect(grouped.get('account-row-1')).toHaveLength(5);
    expect(grouped.get('account-row-1')?.map((transaction) => transaction.id)).toEqual([
      'transaction-1',
      'transaction-2',
      'transaction-3',
      'transaction-4',
      'transaction-5',
    ]);
  });
});

describe('accountFromPersistedRow', () => {
  it('projects persisted account relations into the connected account view model', () => {
    const transactionsByAccountId = groupRecentTransactionsByAccountId([baseTransaction]);

    expect(accountFromPersistedRow(baseAccount, transactionsByAccountId)).toEqual({
      dbId: 'account-row-1',
      accountId: 'plaid-account-1',
      institutionName: 'American Express',
      name: 'American Express Gold Card',
      mask: '2219',
      type: 'credit',
      subtype: 'credit card',
      currentBalance: 184.2,
      limit: 10000,
      cardProductId: 'amex-gold',
      cardProductName: 'American Express Gold Card',
      cardProductIssuer: 'American Express',
      matchStatus: 'suggested',
      recentTransactions: [{ id: 'transaction-1', merchant: 'Whole Foods', amount: '$42.25', date: 'Jul 12', category: 'Groceries' }],
    });
  });

  it('falls back cleanly when optional institution, mask, subtype, and match data are absent', () => {
    const account = accountFromPersistedRow(
      {
        ...baseAccount,
        official_name: null,
        mask: null,
        subtype: null,
        plaid_items: null,
        account_card_matches: [],
      },
      new Map(),
    );

    expect(account).toMatchObject({
      institutionName: 'Plaid Sandbox',
      name: 'Gold Card',
      mask: '0000',
      subtype: 'account',
      cardProductId: null,
      cardProductName: null,
      cardProductIssuer: null,
      matchStatus: null,
      recentTransactions: [],
    });
  });
});

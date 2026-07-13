import { describe, expect, it } from 'vitest';
import type { PlaidConnectedAccount } from './types';
import { deriveLocalTransactionRecommendations, inferRewardCategory, rewardMultiplier } from './transactionRecommendations';
import type { CardProductRow, PlaidTransactionRow } from './usePersistedPlaidData';

const baseProduct = {
  network: 'Visa',
  annual_fee: 95,
  reward_currency: 'points',
  benefits: [],
  source_confidence: 'seed',
  last_verified_at: '2026-07-13',
  created_at: '2026-07-13',
  updated_at: '2026-07-13',
} satisfies Omit<CardProductRow, 'id' | 'issuer' | 'name' | 'rewards'>;

const goldCard: CardProductRow = {
  ...baseProduct,
  id: 'amex-gold',
  issuer: 'American Express',
  name: 'American Express Gold Card',
  rewards: { dining: 4, us_supermarkets: 4, general: 1 },
};

const reserveCard: CardProductRow = {
  ...baseProduct,
  id: 'chase-sapphire-reserve',
  issuer: 'Chase',
  name: 'Chase Sapphire Reserve',
  rewards: { dining: 3, travel: 3, flights: 3, general: 1 },
};

const baseTransaction: PlaidTransactionRow = {
  id: 'transaction-1',
  user_id: 'user-1',
  plaid_item_id: 'item-1',
  plaid_account_id: 'account-row-1',
  account_id: 'plaid-account-1',
  transaction_id: 'plaid-transaction-1',
  name: 'Whole Foods Market',
  merchant_name: 'Whole Foods',
  amount: 50,
  iso_currency_code: 'USD',
  date: '2026-07-13',
  authorized_date: '2026-07-13',
  pending: false,
  payment_channel: 'in store',
  category: ['Shops', 'Supermarkets and Groceries'],
  category_id: null,
  personal_finance_category: null,
  created_at: '2026-07-13T00:00:00Z',
  updated_at: '2026-07-13T00:00:00Z',
};

const reserveAccount: PlaidConnectedAccount = {
  dbId: 'account-row-1',
  accountId: 'plaid-account-1',
  institutionName: 'Chase',
  name: 'Sapphire Reserve',
  mask: '1184',
  type: 'credit',
  subtype: 'credit card',
  currentBalance: 100,
  limit: 1000,
  cardProductId: 'chase-sapphire-reserve',
  cardProductName: 'Chase Sapphire Reserve',
  cardProductIssuer: 'Chase',
};

describe('inferRewardCategory', () => {
  it('prefers grocery merchant signals before broader food terms', () => {
    expect(inferRewardCategory({ ...baseTransaction, merchant_name: 'Whole Foods Market', category: ['Food and Drink'] })).toBe('groceries');
  });

  it('uses personal finance category text when merchant labels are generic', () => {
    expect(
      inferRewardCategory({
        ...baseTransaction,
        merchant_name: null,
        name: 'Card purchase',
        category: [],
        personal_finance_category: { primary: 'TRANSPORTATION', detailed: 'TRAVEL_FLIGHTS' },
      }),
    ).toBe('flights');
  });
});

describe('rewardMultiplier', () => {
  it('uses category aliases from stored card-product rewards', () => {
    expect(rewardMultiplier(goldCard, 'groceries')).toBe(4);
    expect(rewardMultiplier(reserveCard, 'flights')).toBe(3);
  });
});

describe('deriveLocalTransactionRecommendations', () => {
  it('recommends the stronger card for settled positive Plaid transactions', () => {
    const recommendations = deriveLocalTransactionRecommendations({
      plaidTransactions: [baseTransaction],
      cardProducts: [reserveCard, goldCard],
      plaidAccounts: [reserveAccount],
    });

    expect(recommendations).toEqual([
      expect.objectContaining({
        id: 'transaction-1',
        merchant: 'Whole Foods',
        amount: '$50.00',
        date: 'Jul 13',
        category: 'groceries',
        currentCard: 'Chase Sapphire Reserve',
        currentMultiplier: 1,
        bestCard: 'American Express Gold Card',
        bestMultiplier: 4,
        estimatedLift: '$1.50',
      }),
    ]);
  });

  it('treats unmatched accounts as 1x without hiding the recommendation', () => {
    const recommendations = deriveLocalTransactionRecommendations({
      plaidTransactions: [{ ...baseTransaction, plaid_account_id: 'unmatched-account-row' }],
      cardProducts: [goldCard],
      plaidAccounts: [reserveAccount],
    });

    expect(recommendations[0]).toMatchObject({
      currentCard: 'Unmatched card',
      currentMultiplier: 1,
      bestCard: 'American Express Gold Card',
      bestMultiplier: 4,
    });
  });

  it('ignores pending, refund, and already optimal transactions', () => {
    const recommendations = deriveLocalTransactionRecommendations({
      plaidTransactions: [
        { ...baseTransaction, id: 'pending', pending: true },
        { ...baseTransaction, id: 'refund', amount: -20 },
        { ...baseTransaction, id: 'optimal', plaid_account_id: 'gold-account-row' },
      ],
      cardProducts: [goldCard, reserveCard],
      plaidAccounts: [{ ...reserveAccount, dbId: 'gold-account-row', cardProductId: 'amex-gold', cardProductName: 'American Express Gold Card' }],
    });

    expect(recommendations).toEqual([]);
  });
});

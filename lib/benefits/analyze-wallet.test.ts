import { describe, expect, it } from 'vitest';
import { analyzeWallet, inferBenefitCategory } from './analyze-wallet';
import type { AnalysisAccount, AnalysisCardProduct, AnalysisTransaction } from './types';

const asOf = new Date('2026-06-29T12:00:00Z');

const cardProducts: AnalysisCardProduct[] = [
  {
    id: 'amex-gold',
    issuer: 'American Express',
    name: 'Gold Card',
    annual_fee: 325,
    reward_currency: 'Membership Rewards',
    rewards: { dining: 4, groceries: 4, general: 1 },
    benefits: [
      {
        id: 'dining-credit',
        type: 'statement_credit',
        title: '$10 dining credit',
        value: 10,
        cadence: 'monthly',
        eligible_categories: ['dining'],
        enrollment_required: true,
      },
      {
        id: 'gold-welcome',
        type: 'welcome_bonus',
        title: '90k Membership Rewards',
        target: 6000,
        days: 90,
        bonus: '90k Membership Rewards',
      },
    ],
  },
  {
    id: 'venture-x',
    issuer: 'Capital One',
    name: 'Venture X',
    annual_fee: 395,
    reward_currency: 'Miles',
    rewards: { travel: 2, groceries: 2, general: 2 },
    benefits: [
      {
        id: 'travel-credit',
        type: 'statement_credit',
        title: '$300 travel credit',
        value: 300,
        cadence: 'annual',
        eligible_categories: ['travel'],
      },
    ],
  },
];

const accounts: AnalysisAccount[] = [
  { id: 'acct-gold', account_id: 'plaid-gold', name: 'Gold Card', card_product_id: 'amex-gold' },
  { id: 'acct-venture', account_id: 'plaid-venture', name: 'Venture X', card_product_id: 'venture-x' },
];

const transactions: AnalysisTransaction[] = [
  {
    id: 'tx-chipotle',
    plaid_account_id: 'acct-venture',
    account_id: 'plaid-venture',
    merchant_name: 'Chipotle',
    name: 'Chipotle',
    amount: 50,
    date: '2026-06-28',
    category: ['Food and Drink', 'Restaurants'],
    pending: false,
  },
  {
    id: 'tx-resy',
    plaid_account_id: 'acct-gold',
    account_id: 'plaid-gold',
    merchant_name: 'Resy',
    name: 'Resy dining',
    amount: 8,
    date: '2026-06-20',
    category: ['Food and Drink', 'Restaurants'],
    pending: false,
  },
  {
    id: 'tx-whole-foods',
    plaid_account_id: 'acct-gold',
    account_id: 'plaid-gold',
    merchant_name: 'Whole Foods',
    name: 'Whole Foods Market',
    amount: 150,
    date: '2026-06-18',
    category: ['Shops', 'Supermarkets and Groceries'],
    pending: false,
  },
  {
    id: 'tx-pending',
    plaid_account_id: 'acct-gold',
    account_id: 'plaid-gold',
    merchant_name: 'Coffee',
    name: 'Pending coffee',
    amount: 20,
    date: '2026-06-29',
    category: ['Food and Drink'],
    pending: true,
  },
];

describe('inferBenefitCategory', () => {
  it('normalizes Plaid merchant and category text into reward categories', () => {
    expect(inferBenefitCategory(transactions[0])).toBe('dining');
    expect(inferBenefitCategory(transactions[2])).toBe('groceries');
  });
});

describe('analyzeWallet', () => {
  it('builds statement credit, welcome bonus, alert, and missed-value outputs from linked wallet data', () => {
    const analysis = analyzeWallet({ cardProducts, accounts, transactions, asOf });

    expect(analysis.trackers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'acct-gold-dining-credit',
          cardProductId: 'amex-gold',
          title: '$10 dining credit',
          used: 8,
          target: 10,
          progress: 80,
          status: 'in-progress',
        }),
        expect.objectContaining({
          id: 'acct-venture-travel-credit',
          status: 'available',
          used: 0,
          progress: 0,
        }),
      ]),
    );
    expect(analysis.welcomeBonuses).toEqual([
      expect.objectContaining({
        id: 'acct-gold-gold-welcome',
        used: 158,
        target: 6000,
        progress: 3,
        status: 'in-progress',
      }),
    ]);
    expect(analysis.recommendations).toEqual([
      expect.objectContaining({
        transactionId: 'tx-chipotle',
        currentCard: 'Venture X',
        bestCard: 'Gold Card',
        currentMultiplier: 2,
        bestMultiplier: 4,
        estimatedLift: 1,
      }),
    ]);
    expect(analysis.alerts).toEqual(
      expect.arrayContaining(['Venture X: $300 travel credit has unused value.', 'Chipotle: use Gold Card next time.']),
    );
  });
});

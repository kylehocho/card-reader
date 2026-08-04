import { describe, expect, it } from 'vitest';
import { buildWalletAnalysisViews } from './useWalletAnalysisViews';
import type { PlaidConnectedAccount } from './types';
import type { CardProductRow, PlaidTransactionRow } from './usePersistedPlaidData';
import type { WalletAnalysis } from '@/lib/benefits/types';
import type { AnalysisAlertView, BenefitView, WelcomeBonusView } from '@/lib/benefits/wallet-analysis-view';

const fallbackBenefit: BenefitView = {
  id: 'seed-benefit',
  title: 'Seed benefit',
  status: 'available',
  detail: 'Seed wallet copy.',
  progress: 0,
};

const fallbackWelcomeBonus: WelcomeBonusView = {
  id: 'seed-gold-welcome',
  cardProductId: 'amex-gold',
  card: 'Gold Card',
  issuer: 'American Express',
  deadline: '19 days left',
  spent: 5358,
  target: 6000,
  bonus: '90k Membership Rewards',
  nextMove: 'Route dining and groceries here.',
};

const fallbackNotification: AnalysisAlertView = {
  id: 'seed-alert',
  title: 'Seed alert',
  detail: 'Demo wallet alert.',
  action: 'Review demo wallet.',
  severity: 'info',
};

const goldAccount: PlaidConnectedAccount = {
  dbId: 'acct-row-gold',
  accountId: 'plaid-gold',
  institutionName: 'Plaid Sandbox',
  name: 'Gold Card',
  mask: '3007',
  type: 'credit',
  subtype: 'credit card',
  currentBalance: 84,
  limit: 10000,
  cardProductId: 'amex-gold',
  cardProductName: 'Gold Card',
  cardProductIssuer: 'American Express',
  matchStatus: 'user_confirmed',
};

const walletAnalysis: WalletAnalysis = {
  trackers: [
    {
      id: 'tracker-gold-dining',
      cardProductId: 'amex-gold',
      cardName: 'Gold Card',
      issuer: 'American Express',
      title: '$10 dining credit',
      type: 'statement_credit',
      cadence: 'monthly',
      status: 'needs-action',
      used: 0,
      target: 10,
      progress: 0,
      detail: '$0 of $10 detected from linked transactions.',
      nextAction: 'Route eligible spend here.',
    },
  ],
  welcomeBonuses: [
    {
      id: 'tracker-gold-welcome',
      cardProductId: 'amex-gold',
      cardName: 'Gold Card',
      issuer: 'American Express',
      title: '90k Membership Rewards',
      type: 'welcome_bonus',
      cadence: 'first_year',
      status: 'in-progress',
      used: 5358,
      target: 6000,
      progress: 89,
      detail: '$642 left to unlock the bonus.',
      nextAction: 'Route groceries and dining here.',
    },
  ],
  recommendations: [
    {
      id: 'recommend-chipotle',
      transactionId: 'tx-chipotle',
      merchant: 'Chipotle',
      category: 'dining',
      currentCard: 'Venture X',
      bestCard: 'Gold Card',
      currentMultiplier: 2,
      bestMultiplier: 4,
      estimatedLift: 1.4,
      reason: 'Dining spend earns more on Gold Card.',
    },
  ],
  alerts: ['Gold Card: $10 dining credit needs setup or enrollment.'],
};

const cardProducts = [
  {
    id: 'amex-gold',
    issuer: 'American Express',
    name: 'Gold Card',
    rewards: { dining: 4, groceries: 4, general: 1 },
  },
  {
    id: 'capital-one-venture-x',
    issuer: 'Capital One',
    name: 'Venture X',
    rewards: { general: 2, dining: 2 },
  },
] as CardProductRow[];

const plaidTransactions = [
  {
    id: 'tx-chipotle',
    plaid_account_id: 'acct-row-venture',
    account_id: 'venture',
    merchant_name: 'Chipotle',
    name: 'Chipotle',
    amount: 70,
    date: '2026-08-01',
    category: ['Food and Drink', 'Restaurants'],
    pending: false,
  },
] as PlaidTransactionRow[];

describe('buildWalletAnalysisViews', () => {
  it('keeps anonymous wallets on seed copy and local missed-value recommendations', () => {
    const views = buildWalletAnalysisViews({
      isUserBackedWallet: false,
      selectedCardBenefits: [fallbackBenefit],
      selectedPlaidAccount: null,
      walletAnalysis: null,
      plaidAccounts: [],
      plaidTransactions,
      cardProducts,
      fallbackWelcomeBonuses: [fallbackWelcomeBonus],
      fallbackNotifications: [fallbackNotification],
    });

    expect(views.welcomeBonuses).toEqual([fallbackWelcomeBonus]);
    expect(views.displayedBenefits).toEqual([fallbackBenefit]);
    expect(views.visibleNotifications).toEqual([fallbackNotification]);
  });

  it('projects signed-in API analysis into selected card benefits, alerts, bonuses, and missed-value rows', () => {
    const views = buildWalletAnalysisViews({
      isUserBackedWallet: true,
      selectedCardBenefits: [fallbackBenefit],
      selectedPlaidAccount: goldAccount,
      walletAnalysis,
      plaidAccounts: [goldAccount],
      plaidTransactions: [],
      cardProducts,
      fallbackWelcomeBonuses: [fallbackWelcomeBonus],
      fallbackNotifications: [fallbackNotification],
    });

    expect(views.displayedBenefits).toEqual([
      {
        id: 'tracker-gold-dining',
        title: '$10 dining credit',
        status: 'expiring',
        detail: '$0 of $10 detected from linked transactions.',
        progress: 0,
      },
    ]);
    expect(views.welcomeBonuses[0]).toMatchObject({ id: 'tracker-gold-welcome', card: 'Gold Card', deadline: 'First-year offer' });
    expect(views.visibleNotifications[0]).toMatchObject({ id: 'analysis-alert-0', title: 'Gold Card', severity: 'warning' });
    expect(views.featuredTransactionRecommendation).toMatchObject({ id: 'recommend-chipotle', estimatedLift: '$1.40' });
  });

  it('filters seed welcome bonuses to linked card products before analysis loads', () => {
    const views = buildWalletAnalysisViews({
      isUserBackedWallet: true,
      selectedCardBenefits: [fallbackBenefit],
      selectedPlaidAccount: goldAccount,
      walletAnalysis: null,
      plaidAccounts: [goldAccount, { ...goldAccount, accountId: 'unmatched', cardProductId: null }],
      plaidTransactions: [],
      cardProducts,
      fallbackWelcomeBonuses: [fallbackWelcomeBonus, { ...fallbackWelcomeBonus, id: 'venture-welcome', cardProductId: 'capital-one-venture-x' }],
      fallbackNotifications: [fallbackNotification],
    });

    expect(views.welcomeBonuses).toEqual([fallbackWelcomeBonus]);
    expect(views.visibleNotifications).toEqual([]);
  });
});

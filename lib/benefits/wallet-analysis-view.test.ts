import { describe, expect, it } from 'vitest';
import { alertFromAnalysis, benefitFromTracker, recommendationFromAnalysis, welcomeBonusFromTracker } from './wallet-analysis-view';
import type { BenefitTracker, CardRecommendation } from './types';

const tracker: BenefitTracker = {
  id: 'acct-gold-dining-credit',
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
  nextAction: 'Confirm enrollment, then route eligible spend here.',
};

const recommendation: CardRecommendation = {
  id: 'tx-chipotle-recommendation',
  transactionId: 'tx-chipotle',
  merchant: 'Chipotle',
  category: 'dining',
  currentCard: 'Venture X',
  bestCard: 'Gold Card',
  currentMultiplier: 2,
  bestMultiplier: 4,
  estimatedLift: 1.25,
  reason: 'Dining spend earns more on Gold Card.',
};

describe('wallet analysis view mapping', () => {
  it('maps benefit trackers into signed-in wallet benefit rows', () => {
    expect(benefitFromTracker(tracker)).toEqual({
      id: 'acct-gold-dining-credit',
      title: '$10 dining credit',
      status: 'expiring',
      detail: '$0 of $10 detected from linked transactions.',
      progress: 0,
    });
  });

  it('maps welcome trackers into carousel cards without seed copy', () => {
    expect(welcomeBonusFromTracker({ ...tracker, type: 'welcome_bonus', cadence: 'first_year', status: 'in-progress', used: 2500, target: 6000 })).toEqual({
      id: 'acct-gold-dining-credit',
      cardProductId: 'amex-gold',
      card: 'Gold Card',
      issuer: 'American Express',
      deadline: 'First-year offer',
      spent: 2500,
      target: 6000,
      bonus: '$10 dining credit',
      nextMove: 'Confirm enrollment, then route eligible spend here.',
    });
  });

  it('maps API recommendations into missed-value UI rows with formatted lift', () => {
    expect(recommendationFromAnalysis(recommendation)).toEqual({
      id: 'tx-chipotle-recommendation',
      merchant: 'Chipotle',
      amount: '$1.25',
      date: 'Synced analysis',
      category: 'dining',
      currentCard: 'Venture X',
      currentMultiplier: 2,
      bestCard: 'Gold Card',
      bestMultiplier: 4,
      estimatedLift: '$1.25',
      reason: 'Dining spend earns more on Gold Card.',
    });
  });

  it('maps analysis alerts with stable ids and severity ordering', () => {
    expect(alertFromAnalysis('Gold Card: $10 dining credit needs setup or enrollment.', 0)).toEqual({
      id: 'analysis-alert-0',
      title: 'Gold Card',
      detail: 'Gold Card: $10 dining credit needs setup or enrollment.',
      action: 'Review the matched card and route spend before the next reset.',
      severity: 'warning',
    });
    expect(alertFromAnalysis('Chipotle: use Gold Card next time.', 1).severity).toBe('info');
  });
});

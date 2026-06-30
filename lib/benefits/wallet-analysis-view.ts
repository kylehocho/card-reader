import type { BenefitTracker, CardRecommendation, RewardCategory } from '@/lib/benefits/types';

export type BenefitView = {
  id: string;
  title: string;
  status: 'available' | 'in-progress' | 'used' | 'expiring';
  detail: string;
  progress?: number;
};

export type TransactionRecommendationView = {
  id: string;
  merchant: string;
  amount: string;
  date: string;
  category: RewardCategory;
  currentCard: string;
  currentMultiplier: number;
  bestCard: string;
  bestMultiplier: number;
  estimatedLift: string;
  reason: string;
};

export type WelcomeBonusView = {
  id: string;
  cardProductId: string;
  card: string;
  issuer: string;
  deadline: string;
  spent: number;
  target: number;
  bonus: string;
  nextMove: string;
};

export type AnalysisAlertView = {
  id: string;
  title: string;
  detail: string;
  action: string;
  severity: 'info' | 'warning' | 'urgent';
};

export function formatWalletAnalysisCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function benefitStatusFromTracker(status: BenefitTracker['status']): BenefitView['status'] {
  switch (status) {
    case 'available':
      return 'available';
    case 'used':
      return 'used';
    case 'needs-action':
      return 'expiring';
    case 'in-progress':
      return 'in-progress';
  }
}

export function recommendationFromAnalysis(recommendation: CardRecommendation): TransactionRecommendationView {
  return {
    id: recommendation.id,
    merchant: recommendation.merchant,
    amount: formatWalletAnalysisCurrency(recommendation.estimatedLift),
    date: 'Synced analysis',
    category: recommendation.category,
    currentCard: recommendation.currentCard,
    currentMultiplier: recommendation.currentMultiplier,
    bestCard: recommendation.bestCard,
    bestMultiplier: recommendation.bestMultiplier,
    estimatedLift: formatWalletAnalysisCurrency(recommendation.estimatedLift),
    reason: recommendation.reason,
  };
}

export function welcomeBonusFromTracker(tracker: BenefitTracker): WelcomeBonusView {
  return {
    id: tracker.id,
    cardProductId: tracker.cardProductId,
    card: tracker.cardName,
    issuer: tracker.issuer,
    deadline: tracker.cadence === 'first_year' ? 'First-year offer' : tracker.cadence,
    spent: tracker.used,
    target: tracker.target,
    bonus: tracker.title,
    nextMove: tracker.nextAction,
  };
}

export function benefitFromTracker(tracker: BenefitTracker): BenefitView {
  return {
    id: tracker.id,
    title: tracker.title,
    status: benefitStatusFromTracker(tracker.status),
    detail: tracker.detail,
    progress: tracker.progress,
  };
}

export function alertFromAnalysis(alert: string, index: number): AnalysisAlertView {
  return {
    id: `analysis-alert-${index}`,
    title: alert.split(':')[0] ?? 'Wallet alert',
    detail: alert,
    action: 'Review the matched card and route spend before the next reset.',
    severity: index === 0 ? 'warning' : 'info',
  };
}

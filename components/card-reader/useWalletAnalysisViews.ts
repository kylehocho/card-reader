'use client';

import type { PlaidConnectedAccount } from '@/components/card-reader/types';
import { dedupeTransactionRecommendations, deriveLocalTransactionRecommendations } from '@/components/card-reader/transactionRecommendations';
import type { CardProductRow, PlaidTransactionRow } from '@/components/card-reader/usePersistedPlaidData';
import type { WalletAnalysis } from '@/lib/benefits/types';
import {
  alertFromAnalysis,
  benefitFromTracker,
  recommendationFromAnalysis,
  welcomeBonusFromTracker,
  type AnalysisAlertView,
  type BenefitView,
  type WelcomeBonusView,
} from '@/lib/benefits/wallet-analysis-view';
import { useMemo } from 'react';

export type WalletAnalysisViewsOptions = {
  isUserBackedWallet: boolean;
  selectedCardBenefits: BenefitView[];
  selectedPlaidAccount: PlaidConnectedAccount | null;
  walletAnalysis: WalletAnalysis | null;
  plaidAccounts: PlaidConnectedAccount[];
  plaidTransactions: PlaidTransactionRow[];
  cardProducts: CardProductRow[];
  fallbackWelcomeBonuses: WelcomeBonusView[];
  fallbackNotifications: AnalysisAlertView[];
};

export function buildWalletAnalysisViews({
  isUserBackedWallet,
  selectedCardBenefits,
  selectedPlaidAccount,
  walletAnalysis,
  plaidAccounts,
  plaidTransactions,
  cardProducts,
  fallbackWelcomeBonuses,
  fallbackNotifications,
}: WalletAnalysisViewsOptions) {
  const selectedAnalysisTrackers = selectedPlaidAccount?.cardProductId
    ? (walletAnalysis?.trackers ?? []).filter((tracker) => tracker.cardProductId === selectedPlaidAccount.cardProductId)
    : [];

  const welcomeBonuses = (() => {
    if (!isUserBackedWallet) return fallbackWelcomeBonuses;
    if (walletAnalysis) return walletAnalysis.welcomeBonuses.map(welcomeBonusFromTracker);

    const linkedCardProductIds = new Set(plaidAccounts.map((account) => account.cardProductId).filter(Boolean));
    return fallbackWelcomeBonuses.filter((bonus) => linkedCardProductIds.has(bonus.cardProductId));
  })();

  const displayedBenefits =
    isUserBackedWallet && selectedAnalysisTrackers.length > 0 ? selectedAnalysisTrackers.map(benefitFromTracker) : selectedCardBenefits;

  const visibleNotifications = isUserBackedWallet ? (walletAnalysis?.alerts ?? []).map(alertFromAnalysis) : fallbackNotifications;
  const analysisTransactionRecommendations = (walletAnalysis?.recommendations ?? []).map(recommendationFromAnalysis);
  const localTransactionRecommendations = deriveLocalTransactionRecommendations({ plaidTransactions, cardProducts, plaidAccounts });
  const transactionRecommendations = walletAnalysis ? analysisTransactionRecommendations : localTransactionRecommendations;

  return {
    selectedAnalysisTrackers,
    welcomeBonuses,
    displayedBenefits,
    visibleNotifications,
    transactionRecommendations,
    expiringValueRecommendations: dedupeTransactionRecommendations(transactionRecommendations).slice(0, 4),
    featuredTransactionRecommendation: transactionRecommendations[0] ?? null,
  };
}

export function useWalletAnalysisViews(options: WalletAnalysisViewsOptions) {
  const {
    isUserBackedWallet,
    selectedCardBenefits,
    selectedPlaidAccount,
    walletAnalysis,
    plaidAccounts,
    plaidTransactions,
    cardProducts,
    fallbackWelcomeBonuses,
    fallbackNotifications,
  } = options;

  return useMemo(
    () =>
      buildWalletAnalysisViews({
        isUserBackedWallet,
        selectedCardBenefits,
        selectedPlaidAccount,
        walletAnalysis,
        plaidAccounts,
        plaidTransactions,
        cardProducts,
        fallbackWelcomeBonuses,
        fallbackNotifications,
      }),
    [
      isUserBackedWallet,
      selectedCardBenefits,
      selectedPlaidAccount,
      walletAnalysis,
      plaidAccounts,
      plaidTransactions,
      cardProducts,
      fallbackWelcomeBonuses,
      fallbackNotifications,
    ],
  );
}

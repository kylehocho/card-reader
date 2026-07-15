'use client';

import { readableRewardCategory } from '@/components/card-reader/transactionRecommendations';
import { demoMerchantContextForQuery } from '@/lib/recommendation/use-now-demo-merchants';
import { buildUseNowRouteSearchForMerchant, parseUseNowRouteState } from '@/lib/recommendation/use-now-route-state';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';
import type { RewardCategory } from '@/lib/benefits/types';
import { useCallback, useEffect, useMemo, useState } from 'react';

export type MerchantResult = {
  id: string;
  merchant: string;
  category: string;
  card: string;
  rank: number;
  reward: string;
  value: string;
  reason: string;
  matchedBenefits: string[];
  tags: string[];
};

export type MerchantRecommendationStatus = 'idle' | 'loading' | 'ready' | 'error';

type MerchantApiRecommendation = {
  merchant: string;
  category: RewardCategory;
  bestCard: {
    id: string;
    issuer: string;
    name: string;
    multiplier: number;
    rewardCurrency?: string | null;
  };
  runnerUp?: {
    id: string;
    issuer: string;
    name: string;
    multiplier: number;
    rewardCurrency?: string | null;
  };
  reason: string;
  matchedOffer?: {
    title: string;
  } | null;
};

type UseMerchantRecommendationOptions<Screen extends string> = {
  isUserBackedWallet: boolean;
  seedMerchantResults: MerchantResult[];
  setScreen: (screen: Screen) => void;
  setShowMerchantSearch: (show: boolean) => void;
  setWalletSelectionExpanded: (expanded: boolean) => void;
};

export function merchantApiRecommendationToResult(recommendation: MerchantApiRecommendation): MerchantResult {
  const offerTitle = recommendation.matchedOffer?.title;

  return {
    id: `live-${recommendation.merchant.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    merchant: recommendation.merchant,
    category: readableRewardCategory(recommendation.category),
    card: recommendation.bestCard.name,
    rank: 1,
    reward: `${recommendation.bestCard.multiplier}x ${recommendation.bestCard.rewardCurrency ?? 'rewards'}`,
    value: 'Live recommendation',
    reason: recommendation.reason,
    matchedBenefits: [offerTitle, recommendation.runnerUp ? `Runner-up: ${recommendation.runnerUp.name}` : null].filter((value): value is string => Boolean(value)),
    tags: [recommendation.merchant.toLowerCase(), recommendation.category.toLowerCase()],
  };
}

export function merchantResultsForQuery({
  query,
  seedMerchantResults,
  liveMerchantResult,
}: {
  query: string;
  seedMerchantResults: MerchantResult[];
  liveMerchantResult: MerchantResult | null;
}) {
  const normalized = query.trim().toLowerCase();
  const results = normalized
    ? seedMerchantResults.filter((result) =>
        [result.merchant, result.category, result.card, ...result.tags].some((value) => value.toLowerCase().includes(normalized)),
      )
    : [];

  const sortedResults = [...results].sort((a, b) => a.rank - b.rank);
  if (!liveMerchantResult || !normalized) return sortedResults;

  return [
    liveMerchantResult,
    ...sortedResults
      .filter((result) => result.merchant !== liveMerchantResult.merchant || result.card !== liveMerchantResult.card)
      .map((result) => ({ ...result, rank: result.rank + 1 })),
  ];
}

export function useMerchantRecommendation<Screen extends string>({
  isUserBackedWallet,
  seedMerchantResults,
  setScreen,
  setShowMerchantSearch,
  setWalletSelectionExpanded,
}: UseMerchantRecommendationOptions<Screen>) {
  const [merchantQuery, setMerchantQuery] = useState('');
  const [merchantRecommendation, setMerchantRecommendation] = useState<MerchantApiRecommendation | null>(null);
  const [merchantRecommendationStatus, setMerchantRecommendationStatus] = useState<MerchantRecommendationStatus>('idle');
  const [merchantRecommendationError, setMerchantRecommendationError] = useState<string | null>(null);

  const updateMerchantQuery = useCallback((query: string) => {
    setMerchantQuery(query);

    if (!query.trim()) {
      setMerchantRecommendation(null);
      setMerchantRecommendationStatus('idle');
      setMerchantRecommendationError(null);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timeoutId = window.setTimeout(() => {
      const routeState = parseUseNowRouteState(window.location.search);
      if (routeState.screen) setScreen(routeState.screen as Screen);
      if (routeState.merchant) setMerchantQuery(routeState.merchant);
      if (routeState.showMerchantSearch) setShowMerchantSearch(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [setScreen, setShowMerchantSearch]);

  const openUseNowDemo = useCallback((merchant: string) => {
    updateMerchantQuery(merchant);
    setScreen('use-now' as Screen);
    setShowMerchantSearch(false);
    setWalletSelectionExpanded(false);

    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', buildUseNowRouteSearchForMerchant(merchant));
    }
  }, [setScreen, setShowMerchantSearch, setWalletSelectionExpanded, updateMerchantQuery]);

  useEffect(() => {
    const merchant = merchantQuery.trim();
    if (!merchant) return;

    const abortController = new AbortController();

    async function loadMerchantRecommendation() {
      setMerchantRecommendationStatus('loading');
      setMerchantRecommendationError(null);

      try {
        const supabase = getBrowserSupabaseClient();
        const { data } = supabase && isUserBackedWallet ? await supabase.auth.getSession() : { data: { session: null } };
        const accessToken = data.session?.access_token;
        const response = await fetch('/api/recommend-card', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: 'Bearer ' + accessToken } : {}),
          },
          body: JSON.stringify(demoMerchantContextForQuery(merchant)),
          signal: abortController.signal,
        });
        const payload = (await response.json().catch(() => ({}))) as MerchantApiRecommendation & { error?: string };

        if (!response.ok || !payload.bestCard) {
          throw new Error(payload.error ?? 'Unable to load merchant recommendation.');
        }

        setMerchantRecommendation(payload);
        setMerchantRecommendationStatus('ready');
      } catch (error) {
        if (abortController.signal.aborted) return;
        setMerchantRecommendation(null);
        setMerchantRecommendationStatus('error');
        setMerchantRecommendationError(error instanceof Error ? error.message : 'Unable to load merchant recommendation.');
      }
    }

    void loadMerchantRecommendation();

    return () => abortController.abort();
  }, [isUserBackedWallet, merchantQuery]);

  const liveMerchantResult = useMemo<MerchantResult | null>(() => {
    if (merchantRecommendationStatus !== 'ready' || !merchantRecommendation) return null;

    return merchantApiRecommendationToResult(merchantRecommendation);
  }, [merchantRecommendation, merchantRecommendationStatus]);

  const merchantResults = useMemo(
    () => merchantResultsForQuery({ query: merchantQuery, seedMerchantResults, liveMerchantResult }),
    [liveMerchantResult, merchantQuery, seedMerchantResults],
  );
  const featuredMerchant = merchantResults[0] ?? seedMerchantResults[0];

  return {
    featuredMerchant,
    merchantQuery,
    merchantRecommendationError,
    merchantRecommendationStatus,
    merchantResults,
    openUseNowDemo,
    setMerchantQuery: updateMerchantQuery,
  };
}

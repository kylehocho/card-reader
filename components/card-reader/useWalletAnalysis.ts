'use client';

import type { AuthStatus, ProfileStatus } from '@/components/auth/types';
import type { WalletAnalysis } from '@/lib/benefits/types';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';
import { useCallback, useEffect, useState } from 'react';

export type WalletAnalysisStatus = 'idle' | 'loading' | 'ready' | 'error';

type WalletAnalysisResponse = {
  analysis?: WalletAnalysis;
  error?: string;
};

type WalletAnalysisAccessState = {
  usesSupabase: boolean;
  authStatus: AuthStatus;
  profileStatus: ProfileStatus;
};

type UseWalletAnalysisInput = WalletAnalysisAccessState;

export function shouldLoadWalletAnalysis({ usesSupabase, authStatus, profileStatus }: WalletAnalysisAccessState) {
  return usesSupabase && authStatus === 'authenticated' && profileStatus === 'ready';
}

export function walletAnalysisErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to load wallet analysis.';
}

export function useWalletAnalysis({ usesSupabase, authStatus, profileStatus }: UseWalletAnalysisInput) {
  const [walletAnalysis, setWalletAnalysis] = useState<WalletAnalysis | null>(null);
  const [walletAnalysisStatus, setWalletAnalysisStatus] = useState<WalletAnalysisStatus>('idle');
  const [walletAnalysisError, setWalletAnalysisError] = useState<string | null>(null);

  const resetWalletAnalysis = useCallback(() => {
    setWalletAnalysis(null);
    setWalletAnalysisStatus('idle');
    setWalletAnalysisError(null);
  }, []);

  const loadWalletAnalysis = useCallback(async () => {
    if (!shouldLoadWalletAnalysis({ usesSupabase, authStatus, profileStatus })) {
      resetWalletAnalysis();
      return;
    }

    const supabase = getBrowserSupabaseClient();
    if (!supabase) return;

    setWalletAnalysisStatus('loading');
    setWalletAnalysisError(null);

    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error('Sign in again to refresh wallet analysis.');

      const response = await fetch('/api/wallet/analysis', {
        headers: { Authorization: 'Bearer ' + accessToken },
      });
      const payload = (await response.json()) as WalletAnalysisResponse;

      if (!response.ok || !payload.analysis) {
        throw new Error(payload.error ?? 'Unable to load wallet analysis.');
      }

      setWalletAnalysis(payload.analysis);
      setWalletAnalysisStatus('ready');
    } catch (error) {
      setWalletAnalysis(null);
      setWalletAnalysisStatus('error');
      setWalletAnalysisError(walletAnalysisErrorMessage(error));
    }
  }, [authStatus, profileStatus, resetWalletAnalysis, usesSupabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadWalletAnalysis();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadWalletAnalysis]);

  return {
    walletAnalysis,
    walletAnalysisStatus,
    walletAnalysisError,
    loadWalletAnalysis,
    resetWalletAnalysis,
  };
}

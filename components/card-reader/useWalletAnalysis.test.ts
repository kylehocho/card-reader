import { describe, expect, it } from 'vitest';
import { shouldLoadWalletAnalysis, walletAnalysisErrorMessage } from './useWalletAnalysis';

describe('shouldLoadWalletAnalysis', () => {
  it('allows analysis loading only for Supabase-backed ready profiles', () => {
    expect(
      shouldLoadWalletAnalysis({
        usesSupabase: true,
        authStatus: 'authenticated',
        profileStatus: 'ready',
      }),
    ).toBe(true);
  });

  it('blocks analysis loading for anonymous, incomplete, or local wallets', () => {
    expect(
      shouldLoadWalletAnalysis({
        usesSupabase: false,
        authStatus: 'authenticated',
        profileStatus: 'ready',
      }),
    ).toBe(false);
    expect(
      shouldLoadWalletAnalysis({
        usesSupabase: true,
        authStatus: 'anonymous',
        profileStatus: 'ready',
      }),
    ).toBe(false);
    expect(
      shouldLoadWalletAnalysis({
        usesSupabase: true,
        authStatus: 'authenticated',
        profileStatus: 'missing',
      }),
    ).toBe(false);
  });
});

describe('walletAnalysisErrorMessage', () => {
  it('preserves Error messages and falls back for unknown throws', () => {
    expect(walletAnalysisErrorMessage(new Error('Sign in again.'))).toBe('Sign in again.');
    expect(walletAnalysisErrorMessage('network failed')).toBe('Unable to load wallet analysis.');
  });
});

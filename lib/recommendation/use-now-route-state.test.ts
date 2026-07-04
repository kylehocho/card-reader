import { describe, expect, it } from 'vitest';

import { buildUseNowRouteSearchForMerchant, parseUseNowRouteState } from './use-now-route-state';

describe('Use Now route state', () => {
  it('opens the full Use Now screen for demo merchant deep links', () => {
    expect(parseUseNowRouteState('?screen=use-now&merchant=whole%20foods')).toEqual({
      screen: 'use-now',
      merchant: 'Whole Foods',
      showMerchantSearch: false,
    });
  });

  it('opens the wallet search panel when a wallet route includes a merchant', () => {
    expect(parseUseNowRouteState('?screen=wallet&merchant=Patagonia')).toEqual({
      screen: 'wallet',
      merchant: 'Patagonia',
      showMerchantSearch: true,
    });
  });

  it('ignores unknown screens and caps arbitrary merchant text', () => {
    const merchant = 'A'.repeat(100);

    expect(parseUseNowRouteState(`?screen=admin&merchant=${merchant}`)).toEqual({
      screen: null,
      merchant: 'A'.repeat(80),
      showMerchantSearch: false,
    });
  });

  it('builds shareable Use Now demo search params', () => {
    expect(buildUseNowRouteSearchForMerchant('Delta')).toBe('?screen=use-now&merchant=Delta');
  });
});

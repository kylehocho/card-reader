import { useNowDemoMerchantNames } from '@/lib/recommendation/use-now-demo-merchants';

export type UseNowRouteState = {
  screen: 'wallet' | 'use-now' | null;
  merchant: string | null;
  showMerchantSearch: boolean;
};

const allowedScreens = new Set(['wallet', 'use-now']);

export function parseUseNowRouteState(search: string): UseNowRouteState {
  const params = new URLSearchParams(search);
  const screenParam = params.get('screen')?.trim().toLowerCase() ?? null;
  const merchantParam = params.get('merchant')?.trim() ?? '';
  const normalizedMerchantParam = merchantParam.toLowerCase();
  const demoMerchant = useNowDemoMerchantNames.find((merchant) => merchant.toLowerCase() === normalizedMerchantParam);
  const merchant = demoMerchant ?? (merchantParam ? merchantParam.slice(0, 80) : null);
  const screen = screenParam && allowedScreens.has(screenParam) ? (screenParam as UseNowRouteState['screen']) : null;

  return {
    screen,
    merchant,
    showMerchantSearch: screen === 'wallet' && Boolean(merchant),
  };
}

export function buildUseNowRouteSearchForMerchant(merchant: string) {
  const params = new URLSearchParams();
  params.set('screen', 'use-now');
  params.set('merchant', merchant);
  return '?' + params.toString();
}

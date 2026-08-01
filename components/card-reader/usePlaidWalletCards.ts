'use client';

import type { PlaidConnectedAccount } from '@/components/card-reader/types';

export type StoredPlaidConnection = {
  accounts: PlaidConnectedAccount[];
};

export const PLAID_STORAGE_KEY = 'card-reader.plaid-connections.v1';

export function formatWalletCurrency(value: number | null) {
  if (value === null) return 'Balance unavailable';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function getWalletDisplayAccounts(accounts: PlaidConnectedAccount[]) {
  const creditAccounts = accounts.filter((account) => account.type === 'credit' || account.subtype === 'credit card');
  return creditAccounts.length > 0 ? creditAccounts : accounts.slice(0, 1);
}

export function readStoredPlaidConnection(): StoredPlaidConnection | null {
  if (typeof window === 'undefined') return null;

  try {
    const rawConnection = window.localStorage.getItem(PLAID_STORAGE_KEY);
    if (!rawConnection) return null;

    const parsedConnection = JSON.parse(rawConnection) as Partial<StoredPlaidConnection>;
    if (!Array.isArray(parsedConnection.accounts)) return null;

    return {
      accounts: parsedConnection.accounts.filter((account) => typeof account.accountId === 'string' && typeof account.name === 'string'),
    };
  } catch {
    return null;
  }
}

export function writeStoredPlaidConnection(accounts: PlaidConnectedAccount[]) {
  if (typeof window === 'undefined') return;

  if (accounts.length > 0) {
    window.localStorage.setItem(PLAID_STORAGE_KEY, JSON.stringify({ accounts }));
    return;
  }

  window.localStorage.removeItem(PLAID_STORAGE_KEY);
}

export function clearStoredPlaidConnection() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(PLAID_STORAGE_KEY);
}

export function buildPlaidWalletCard(account: PlaidConnectedAccount) {
  const isCredit = account.type === 'credit' || account.subtype === 'credit card';
  const mappedName = account.cardProductName ?? account.name;
  const mappedIssuer = account.cardProductIssuer ?? account.institutionName;
  const hasMappedProduct = Boolean(account.cardProductId);

  return {
    id: `plaid-${account.accountId}`,
    issuer: mappedIssuer,
    name: mappedName,
    last4: account.mask,
    gradient: isCredit ? 'from-[#394150] via-[#18202b] to-[#06080d]' : 'from-[#41505a] via-[#1a2730] to-[#070b0f]',
    accent: '#f4f7fb',
    pointsLabel: hasMappedProduct ? account.institutionName : isCredit ? 'Plaid sandbox liability' : 'Plaid sandbox account',
    pointsValue: formatWalletCurrency(account.currentBalance),
    recommendation: hasMappedProduct
      ? `${account.name} is matched to ${mappedName}. Next step is using transactions and benefits to recommend when to use it.`
      : 'Connected through Plaid Sandbox. Match this account to a card product to unlock benefits and reward rules.',
    spendSummary: account.limit ? `${formatWalletCurrency(account.limit)} credit limit synced from Plaid.` : 'Sandbox account is connected and ready for benefit mapping.',
    categories: [account.subtype || account.type, hasMappedProduct ? 'Matched card' : 'Needs match'],
    multipliers: [{ id: `plaid-${account.accountId}-flat`, category: 'gas' as const, label: hasMappedProduct ? 'Matched product' : 'No earn rates yet', multiplier: hasMappedProduct ? 'Rules' : '--', detail: hasMappedProduct ? 'Card product rules are attached to this account' : 'Match this Plaid account to a card product first', icon: '•' }],
    concierges: [],
    alerts: hasMappedProduct ? ['Sandbox connection active', `Matched to ${mappedName}`] : ['Sandbox connection active', 'Choose a card product match'],
    rewardReset: hasMappedProduct ? 'Card product rules are attached. Transaction-aware recommendations come next.' : 'Plaid connection established. Rewards and perk calendars still need issuer rules.',
    annualFeeMonth: 'Not synced',
    monthlyCreditsUsed: 0,
    monthlyCreditsTotal: 1,
    annualFee: 0,
    perkValueUsed: 0,
    nextResetLabel: 'Awaiting benefit mapping',
    transactions:
      account.recentTransactions && account.recentTransactions.length > 0
        ? account.recentTransactions.slice(0, 5)
        : [{ id: `plaid-${account.accountId}-1`, merchant: account.institutionName, amount: formatWalletCurrency(account.currentBalance), date: 'Synced now', category: account.subtype || account.type }],
    benefits: [{ id: `plaid-${account.accountId}-benefit`, title: 'Plaid connection', status: 'available' as const, detail: 'Sandbox account data is available to the app.', progress: 100 }],
    isBusiness: false,
  };
}

'use client';

import type { Database } from '@/lib/supabase/types';
import AccountMatchSuggestionCard, { accountMatchStateLabel, matchToneClass, type CardProductSuggestion, type MatchSaveState } from './AccountMatchSuggestionCard';
import type { PlaidConnectedAccount } from './types';

type CardProductRow = Database['public']['Tables']['card_products']['Row'];

type PendingPlaidMatchCardProps = {
  account: PlaidConnectedAccount;
  cardProducts: CardProductRow[];
  matchSuggestion: CardProductSuggestion | null;
  saveState: MatchSaveState;
  onUpdateCardMatch: (account: PlaidConnectedAccount, cardProductId: string, source?: 'manual' | 'suggested', confidence?: number) => Promise<void>;
};

function formatCurrency(value: number | null) {
  if (value === null) return 'Balance unavailable';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function PendingPlaidMatchCard({
  account,
  cardProducts,
  matchSuggestion,
  saveState,
  onUpdateCardMatch,
}: PendingPlaidMatchCardProps) {
  const matchStateLabel = accountMatchStateLabel(account, saveState);

  return (
    <div className="rounded-[28px] border border-white/12 bg-[rgba(118,118,128,0.24)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold tracking-[-0.02em] text-white">{account.name}</p>
          <p className="mt-1 text-[13px] text-white/58">
            {account.institutionName} · {account.subtype} •••• {account.mask}
          </p>
        </div>
        <p className="shrink-0 text-[14px] font-semibold text-white">{formatCurrency(account.currentBalance)}</p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <label className="text-[11px] uppercase tracking-[0.18em] text-white/42" htmlFor={`pending-match-${account.accountId}`}>
          Matched card product
        </label>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${matchToneClass(matchStateLabel)}`}>
          {matchStateLabel}
        </span>
      </div>
      <AccountMatchSuggestionCard account={account} suggestion={matchSuggestion} saveState={saveState} onAccept={onUpdateCardMatch} />
      <select
        id={`pending-match-${account.accountId}`}
        value={account.cardProductId ?? ''}
        disabled={saveState === 'saving' || cardProducts.length === 0}
        onChange={(event) => void onUpdateCardMatch(account, event.target.value)}
        className="mt-2 w-full rounded-2xl border border-white/12 bg-[#11151f] px-3 py-3 text-[15px] font-medium text-white outline-none transition focus:border-white/24 disabled:opacity-60"
      >
        <option value="" disabled>
          {cardProducts.length === 0 ? 'Card catalog still loading' : 'Select a card product'}
        </option>
        {cardProducts.map((product) => (
          <option key={product.id} value={product.id}>
            {product.issuer} · {product.name}
          </option>
        ))}
      </select>
      <p className="mt-2 text-[12px] text-white/50">
        {saveState === 'saving'
          ? 'Saving match...'
          : account.cardProductName
            ? `Matched to ${account.cardProductName}`
            : 'You can finish without matching, but recommendations stay generic until this is set.'}
      </p>
    </div>
  );
}

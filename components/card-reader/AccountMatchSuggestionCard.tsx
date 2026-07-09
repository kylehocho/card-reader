'use client';

import type { CardProductMatchSuggestion } from '@/lib/cards/card-match-hints';
import type { Database } from '@/lib/supabase/types';
import type { PlaidConnectedAccount } from './types';

type CardProductRow = Database['public']['Tables']['card_products']['Row'];
export type CardProductSuggestion = CardProductMatchSuggestion<CardProductRow>;
export type MatchSaveState = 'idle' | 'saving' | 'saved' | 'error';

export function accountMatchStateLabel(account: PlaidConnectedAccount, saveState: MatchSaveState) {
  if (saveState === 'saving') return 'Saving';
  if (saveState === 'saved') return 'Saved';
  if (saveState === 'error') return 'Sync issue';
  if (account.matchStatus === 'suggested') return 'Suggested';
  return account.cardProductId ? 'Synced' : 'Unassigned';
}

export function matchToneClass(label: string) {
  if (label === 'Sync issue') return 'bg-rose-300/16 text-rose-50';
  if (label === 'Unassigned') return 'bg-amber-300/16 text-amber-50';
  if (label === 'Suggested') return 'bg-sky-300/16 text-sky-50';
  return 'bg-emerald-300/16 text-emerald-50';
}

export default function AccountMatchSuggestionCard({
  account,
  suggestion,
  saveState,
  onAccept,
}: {
  account: PlaidConnectedAccount;
  suggestion: CardProductSuggestion | null;
  saveState: MatchSaveState;
  onAccept: (account: PlaidConnectedAccount, cardProductId: string, source: 'manual' | 'suggested', confidence: number) => Promise<void>;
}) {
  if (!suggestion || account.cardProductId === suggestion.product.id) return null;

  return (
    <div className="mt-3 rounded-2xl border border-sky-300/18 bg-sky-300/10 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] text-sky-100/62">Suggested match</p>
          <p className="mt-1 text-[14px] font-semibold leading-5 text-white">{suggestion.product.name}</p>
          <p className="mt-1 text-[12px] leading-5 text-white/58">
            {suggestion.product.issuer} · {Math.round(suggestion.confidence * 100)}% confidence
          </p>
        </div>
        <button
          type="button"
          disabled={saveState === 'saving'}
          onClick={() => void onAccept(account, suggestion.product.id, 'suggested', suggestion.confidence)}
          className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#10131a] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Use
        </button>
      </div>
      <p className="mt-2 text-[12px] leading-5 text-white/58">{suggestion.reason}</p>
    </div>
  );
}

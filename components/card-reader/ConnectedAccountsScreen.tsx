'use client';

import type { CardProductMatchSuggestion } from '@/lib/cards/card-match-hints';
import type { Database } from '@/lib/supabase/types';
import type { PlaidConnectedAccount } from './WalletPrototype';

type CardProductRow = Database['public']['Tables']['card_products']['Row'];
type CardProductSuggestion = CardProductMatchSuggestion<CardProductRow>;

type MatchSaveState = 'idle' | 'saving' | 'saved' | 'error';

type ConnectedAccountsScreenProps = {
  accounts: PlaidConnectedAccount[];
  cardProducts: CardProductRow[];
  editingMatchAccountIds: string[];
  matchStatusByAccount: Record<string, MatchSaveState>;
  matchSuggestionByAccountId: Map<string, CardProductSuggestion | null>;
  plaidError: string | null;
  removingAccountIds: string[];
  transactionSyncStatus: 'idle' | 'syncing' | 'error';
  visibleCardIds: Set<string>;
  onAcceptSuggestedMatch: (account: PlaidConnectedAccount, cardProductId: string, source: 'manual' | 'suggested', confidence: number) => Promise<void>;
  onAddAccount: () => void;
  onBack: () => void;
  onCancelEditMatch: (accountId: string) => void;
  onEditMatch: (accountId: string) => void;
  onRemoveAccount: (account: PlaidConnectedAccount) => void;
  onSelectCard: (cardId: string) => void;
  onSyncTransactions: () => void;
  onUpdateCardMatch: (account: PlaidConnectedAccount, cardProductId: string) => Promise<void>;
};

const appleInfoFontStyle = {
  fontFamily: '"SF Pro Text", "SF Pro Display", "SF Pro Icons", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif',
} as const;

function formatCurrency(value: number | null) {
  if (value === null) return 'Balance unavailable';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function accountMatchStateLabel(account: PlaidConnectedAccount, saveState: MatchSaveState) {
  if (saveState === 'saving') return 'Saving';
  if (saveState === 'saved') return 'Saved';
  if (saveState === 'error') return 'Sync issue';
  if (account.matchStatus === 'suggested') return 'Suggested';
  return account.cardProductId ? 'Synced' : 'Unassigned';
}

function matchToneClass(label: string) {
  if (label === 'Sync issue') return 'bg-rose-300/16 text-rose-50';
  if (label === 'Unassigned') return 'bg-amber-300/16 text-amber-50';
  if (label === 'Suggested') return 'bg-sky-300/16 text-sky-50';
  return 'bg-emerald-300/16 text-emerald-50';
}

function MatchSuggestionCard({
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

export default function ConnectedAccountsScreen({
  accounts,
  cardProducts,
  editingMatchAccountIds,
  matchStatusByAccount,
  matchSuggestionByAccountId,
  plaidError,
  removingAccountIds,
  transactionSyncStatus,
  visibleCardIds,
  onAcceptSuggestedMatch,
  onAddAccount,
  onBack,
  onCancelEditMatch,
  onEditMatch,
  onRemoveAccount,
  onSelectCard,
  onSyncTransactions,
  onUpdateCardMatch,
}: ConnectedAccountsScreenProps) {
  return (
    <section className="space-y-4" style={appleInfoFontStyle}>
      <div className="mb-1 flex items-center justify-between px-1">
        <button type="button" onClick={onBack} className="rounded-full bg-[#2c2c2e] px-3 py-1.5 text-sm font-medium text-white/88">
          Back
        </button>
        <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-white">Connected Accounts</h2>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onSyncTransactions} disabled={transactionSyncStatus === 'syncing' || accounts.length === 0} className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white/82 disabled:cursor-not-allowed disabled:opacity-40">
            {transactionSyncStatus === 'syncing' ? 'Syncing' : 'Txns'}
          </button>
          <button type="button" onClick={onAddAccount} className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-[#060816]">
            Add
          </button>
        </div>
      </div>

      {plaidError && (
        <div className="rounded-[22px] border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm leading-5 text-rose-50/90">
          {plaidError}
        </div>
      )}

      {accounts.length > 0 ? (
        <div className="space-y-3">
          {accounts.map((account) => {
            const cardId = `plaid-${account.accountId}`;
            const canViewCard = visibleCardIds.has(cardId);
            const saveState = matchStatusByAccount[account.accountId] ?? 'idle';
            const isEditingMatch = editingMatchAccountIds.includes(account.accountId);
            const showMatchEditor = !account.cardProductId || isEditingMatch;
            const matchStateLabel = accountMatchStateLabel(account, saveState);
            const matchSuggestion = matchSuggestionByAccountId.get(account.accountId) ?? null;
            const isRemoving = removingAccountIds.includes(account.accountId);
            const displayName = account.cardProductName ?? account.name;
            const detailParts = [
              account.institutionName,
              account.cardProductName ? account.name : null,
              account.subtype,
              `•••• ${account.mask}`,
            ].filter(Boolean);

            return (
              <div
                key={account.accountId}
                className="rounded-[26px] border border-white/12 bg-[rgba(118,118,128,0.24)] px-4 py-4 shadow-[0_10px_24px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[16px] font-semibold tracking-[-0.02em] text-white">{displayName}</p>
                    <p className="mt-1 text-[13px] text-white/58">{detailParts.join(' · ')}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[15px] font-semibold text-white">{formatCurrency(account.currentBalance)}</p>
                    <p className="mt-1 text-[12px] text-white/46">{account.limit ? `${formatCurrency(account.limit)} limit` : 'No limit'}</p>
                  </div>
                </div>

                {account.recentTransactions && account.recentTransactions.length > 0 && (
                  <div className="mt-4 rounded-[22px] border border-white/10 bg-black/15 px-3 py-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Recent transactions</p>
                      <p className="text-[11px] text-white/42">{account.recentTransactions.length} loaded</p>
                    </div>
                    <div className="divide-y divide-white/8">
                      {account.recentTransactions.slice(0, 3).map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between gap-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium text-white/86">{transaction.merchant}</p>
                            <p className="mt-0.5 text-[11px] text-white/44">
                              {transaction.date} · {transaction.category}
                            </p>
                          </div>
                          <p className="shrink-0 text-[13px] font-semibold text-white">{transaction.amount}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {showMatchEditor ? (
                  <div className="mt-4 rounded-[22px] border border-white/10 bg-black/15 px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Card product</p>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${matchToneClass(matchStateLabel)}`}>
                        {matchStateLabel}
                      </span>
                    </div>
                    <div>
                      <MatchSuggestionCard account={account} suggestion={matchSuggestion} saveState={saveState} onAccept={onAcceptSuggestedMatch} />
                      <select
                        id={`match-${account.accountId}`}
                        aria-label={`Match ${account.name} to a card product`}
                        value={account.cardProductId ?? ''}
                        disabled={saveState === 'saving'}
                        onChange={(event) => void onUpdateCardMatch(account, event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-white/12 bg-[#11151f] px-3 py-3 text-[15px] font-medium text-white outline-none transition focus:border-white/24 disabled:opacity-60"
                      >
                        <option value="" disabled>
                          Select a card product
                        </option>
                        {cardProducts.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.issuer} · {product.name}
                          </option>
                        ))}
                      </select>
                      {account.cardProductId && (
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <button type="button" onClick={() => onCancelEditMatch(account.accountId)} className="text-[12px] font-medium text-white/62">
                            Cancel edit
                          </button>
                          <button type="button" disabled={isRemoving} onClick={() => onRemoveAccount(account)} className="text-[12px] font-medium text-rose-100/76 disabled:opacity-50">
                            {isRemoving ? 'Removing...' : 'Remove'}
                          </button>
                        </div>
                      )}
                      {!account.cardProductId && (
                        <button type="button" disabled={isRemoving} onClick={() => onRemoveAccount(account)} className="mt-2 text-[12px] font-medium text-rose-100/76 disabled:opacity-50">
                          {isRemoving ? 'Removing...' : 'Remove account'}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${matchToneClass(matchStateLabel)}`}>
                      Synced
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <button type="button" disabled={isRemoving} onClick={() => onRemoveAccount(account)} className="rounded-full bg-rose-300/12 px-3 py-1.5 text-xs font-medium text-rose-50/82 disabled:cursor-not-allowed disabled:opacity-40">
                        {isRemoving ? 'Removing' : 'Remove'}
                      </button>
                      <button type="button" onClick={() => onEditMatch(account.accountId)} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/72">
                        Change
                      </button>
                      <button type="button" disabled={!canViewCard} onClick={() => onSelectCard(cardId)} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/82 disabled:cursor-not-allowed disabled:opacity-40">
                        View card
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[26px] border border-white/12 bg-[rgba(118,118,128,0.24)] px-4 py-4 shadow-[0_10px_24px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl">
          <p className="text-[17px] font-semibold tracking-[-0.02em] text-white">Start with Plaid sandbox</p>
          <p className="mt-2 text-[14px] leading-6 text-white/64">The next successful Link session will exchange a public token server-side, store returned accounts in Supabase, and create wallet cards from the returned credit accounts.</p>
          <button type="button" onClick={onAddAccount} className="mt-4 w-full rounded-full bg-white px-4 py-3 text-sm font-medium text-[#060816]">
            Connect sandbox issuer
          </button>
        </div>
      )}
    </section>
  );
}

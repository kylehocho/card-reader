'use client';

import PendingPlaidMatchCard from '@/components/card-reader/PendingPlaidMatchCard';
import type { CardProductSuggestion, MatchSaveState } from '@/components/card-reader/AccountMatchSuggestionCard';
import type { PlaidConnectedAccount } from '@/components/card-reader/types';
import type { CardProductRow } from '@/components/card-reader/usePersistedPlaidData';
import type { ManualCardDraft, ScanStep } from '@/components/card-reader/useAddCardPresentation';
import { motion } from 'framer-motion';

type PlaidStatus = 'idle' | 'loading' | 'connected' | 'error';
type ManualCardStatus = 'idle' | 'saving' | 'saved' | 'error';

type AddCardSheetProps = {
  cardProducts: CardProductRow[];
  closeAddCardSheet: () => void;
  connectPlaidSandbox: () => void;
  draftCard: ManualCardDraft;
  effectiveManualCardProductId: string;
  finishLinkedCardSetup: () => void;
  finishManualCardAdd: () => void;
  isUserBackedWallet: boolean;
  manualCardStatus: ManualCardStatus;
  matchStatusByAccount: Record<string, MatchSaveState>;
  matchSuggestionByAccountId: Map<string, CardProductSuggestion | null>;
  pendingLinkedAccounts: PlaidConnectedAccount[];
  plaidAccounts: PlaidConnectedAccount[];
  plaidError: string | null;
  plaidStatus: PlaidStatus;
  previewGradient: string;
  scanStep: ScanStep;
  selectedManualCardProduct: Pick<CardProductRow, 'id' | 'issuer' | 'name'> | null;
  setDraftBusiness: (isBusiness: boolean) => void;
  setDraftIssuer: (issuer: string) => void;
  setDraftLast4: (last4: string) => void;
  setDraftName: (name: string) => void;
  setManualCardProductId: (productId: string) => void;
  setPendingLinkedAccounts: (accounts: PlaidConnectedAccount[]) => void;
  setScanStep: (step: ScanStep) => void;
  showConnectedAccounts: () => void;
  updateCardMatch: (account: PlaidConnectedAccount, cardProductId: string, source?: 'manual' | 'suggested', confidence?: number) => Promise<void>;
};

const appleInfoFontStyle = {
  fontFamily: '"SF Pro Text", "SF Pro Display", "SF Pro Icons", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif',
} as const;

export function addCardSheetTitle(scanStep: ScanStep) {
  switch (scanStep) {
    case 'camera':
      return 'Scan your card';
    case 'manual':
      return 'Enter card details';
    case 'plaid':
      return 'Connect with Plaid';
    case 'match':
      return 'Match your card';
    case 'success':
      return 'Card added';
  }
}

export function canSubmitManualCard({
  cardProductCount,
  effectiveManualCardProductId,
  isUserBackedWallet,
  last4,
  manualCardStatus,
}: {
  cardProductCount: number;
  effectiveManualCardProductId: string;
  isUserBackedWallet: boolean;
  last4: string;
  manualCardStatus: ManualCardStatus;
}) {
  if (manualCardStatus === 'saving') return false;
  if (!isUserBackedWallet) return true;

  return Boolean(effectiveManualCardProductId) && cardProductCount > 0 && last4.length === 4;
}

export default function AddCardSheet({
  cardProducts,
  closeAddCardSheet,
  connectPlaidSandbox,
  draftCard,
  effectiveManualCardProductId,
  finishLinkedCardSetup,
  finishManualCardAdd,
  isUserBackedWallet,
  manualCardStatus,
  matchStatusByAccount,
  matchSuggestionByAccountId,
  pendingLinkedAccounts,
  plaidAccounts,
  plaidError,
  plaidStatus,
  previewGradient,
  scanStep,
  selectedManualCardProduct,
  setDraftBusiness,
  setDraftIssuer,
  setDraftLast4,
  setDraftName,
  setManualCardProductId,
  setPendingLinkedAccounts,
  setScanStep,
  showConnectedAccounts,
  updateCardMatch,
}: AddCardSheetProps) {
  const manualSubmitEnabled = canSubmitManualCard({
    cardProductCount: cardProducts.length,
    effectiveManualCardProductId,
    isUserBackedWallet,
    last4: draftCard.last4,
    manualCardStatus,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/78 p-4 backdrop-blur-md">
      <motion.div layout className="max-h-[78vh] w-full max-w-sm overflow-y-auto rounded-[30px] bg-black p-4 shadow-[0_40px_90px_rgba(0,0,0,0.55)]">
        <div className="mt-1 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/50">Add a card</p>
            <h2 className="mt-2 text-[27px] font-semibold tracking-[-0.03em] text-white">{addCardSheetTitle(scanStep)}</h2>
          </div>
          {scanStep !== 'success' && (
            <button type="button" onClick={closeAddCardSheet} className="shrink-0 rounded-full border border-white/15 bg-black/15 px-3 py-1 text-xs text-white/80 backdrop-blur">
              Close
            </button>
          )}
        </div>

        {scanStep !== 'success' && scanStep !== 'match' && (
          <div className={`mt-5 grid gap-3 ${isUserBackedWallet ? 'grid-cols-2' : 'grid-cols-3'}`}>
            <button
              type="button"
              onClick={() => setScanStep('plaid')}
              className={`relative overflow-hidden rounded-[24px] px-3 pb-3 pt-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_16px_30px_rgba(0,0,0,0.22)] ${scanStep === 'plaid' ? 'ring-2 ring-white/25' : ''}`}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_28%),linear-gradient(135deg,#305a52_0%,#14272f_58%,#05080c_100%)]" />
              <div className="relative text-white">
                <p className="text-[9px] uppercase tracking-[0.18em] text-white/70">Plaid</p>
                <p className="mt-5 text-[17px] font-semibold tracking-[-0.02em]">Connect</p>
                <p className="mt-1 text-[11px] text-white/74">Sandbox</p>
              </div>
            </button>
            {!isUserBackedWallet && (
              <button
                type="button"
                onClick={() => setScanStep('camera')}
                className={`relative overflow-hidden rounded-[24px] px-3 pb-3 pt-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_16px_30px_rgba(0,0,0,0.22)] ${scanStep === 'camera' ? 'ring-2 ring-white/25' : ''}`}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_28%),linear-gradient(135deg,#4d5563_0%,#1f2631_58%,#05070c_100%)]" />
                <div className="relative text-white">
                  <p className="text-[9px] uppercase tracking-[0.18em] text-white/70">Camera</p>
                  <p className="mt-5 text-[17px] font-semibold tracking-[-0.02em]">Scan</p>
                  <p className="mt-1 text-[11px] text-white/74">Mock</p>
                </div>
              </button>
            )}
            <button
              type="button"
              onClick={() => setScanStep('manual')}
              className={`relative overflow-hidden rounded-[24px] px-3 pb-3 pt-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_16px_30px_rgba(0,0,0,0.22)] ${scanStep === 'manual' ? 'ring-2 ring-white/25' : ''}`}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_28%),linear-gradient(135deg,#535862_0%,#20252d_58%,#090b10_100%)]" />
              <div className="relative text-white">
                <p className="text-[9px] uppercase tracking-[0.18em] text-white/70">Manual</p>
                <p className="mt-5 text-[17px] font-semibold tracking-[-0.02em]">Enter</p>
                <p className="mt-1 text-[11px] text-white/74">{isUserBackedWallet ? 'Saved' : 'Mock'}</p>
              </div>
            </button>
          </div>
        )}

        {scanStep !== 'success' && scanStep !== 'match' && !isUserBackedWallet && (
          <div className="mt-4 rounded-[26px] border border-white/12 bg-[rgba(118,118,128,0.20)] p-2" style={appleInfoFontStyle}>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Personal', value: false },
                { label: 'Business', value: true },
              ].map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setDraftBusiness(option.value)}
                  className={`rounded-[20px] px-3 py-3 text-sm font-medium transition ${draftCard.isBusiness === option.value ? 'bg-white text-[#060816]' : 'bg-white/[0.06] text-white/70'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="px-2 pb-1 pt-2 text-[12px] leading-5 text-white/54">
              Business cards stay separate in the wallet model without adding Schedule C screens yet.
            </p>
          </div>
        )}

        {scanStep === 'plaid' && (
          <div className="mt-5 rounded-[30px] border border-white/12 bg-[rgba(118,118,128,0.24)] p-4" style={appleInfoFontStyle}>
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/60">Sandbox connection</p>
            <h3 className="mt-2 text-[22px] font-semibold tracking-[-0.03em] text-white">Link a test issuer</h3>
            <p className="mt-2 text-sm leading-6 text-white/72">
              Plaid will only import credit card accounts. Checking, savings, loan, and investment accounts are skipped before they reach this profile.
            </p>

            {plaidAccounts.length > 0 && (
              <div className="mt-4 divide-y divide-white/10 rounded-[24px] border border-white/10 bg-white/5">
                {plaidAccounts.slice(0, 3).map((account) => (
                  <div key={account.accountId} className="px-4 py-3">
                    <p className="text-[15px] font-medium tracking-[-0.01em] text-white">{account.name}</p>
                    <p className="mt-1 text-[13px] text-white/62">{account.institutionName} · {account.subtype} •••• {account.mask}</p>
                  </div>
                ))}
              </div>
            )}

            {plaidError && (
              <div className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-sm leading-5 text-rose-50/90">
                {plaidError}
              </div>
            )}

            <button
              type="button"
              onClick={connectPlaidSandbox}
              disabled={plaidStatus === 'loading'}
              className="mt-4 w-full rounded-full bg-white px-4 py-3 text-sm font-medium text-[#060816] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {plaidStatus === 'loading' ? 'Opening Plaid...' : plaidStatus === 'connected' ? 'Reconnect sandbox account' : 'Connect sandbox account'}
            </button>
          </div>
        )}

        {scanStep === 'match' && (
          <div className="mt-5 space-y-4" style={appleInfoFontStyle}>
            <div className="rounded-[30px] border border-emerald-400/20 bg-emerald-400/10 p-4">
              <p className="text-[10px] uppercase tracking-[0.24em] text-emerald-100/68">Plaid connected</p>
              <h3 className="mt-2 text-[22px] font-semibold tracking-[-0.03em] text-white">Choose the card product</h3>
              <p className="mt-2 text-sm leading-6 text-white/72">
                This saves the mapping to Supabase so the wallet, benefits, and transaction recommendations use the right card rules for this user.
              </p>
            </div>

            {pendingLinkedAccounts.length > 0 ? (
              <div className="space-y-3">
                {pendingLinkedAccounts.map((account) => {
                  const saveState = matchStatusByAccount[account.accountId] ?? 'idle';
                  const matchSuggestion = matchSuggestionByAccountId.get(account.accountId) ?? null;

                  return (
                    <PendingPlaidMatchCard
                      key={account.accountId}
                      account={account}
                      cardProducts={cardProducts}
                      matchSuggestion={matchSuggestion}
                      saveState={saveState}
                      onUpdateCardMatch={updateCardMatch}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[28px] border border-white/12 bg-[rgba(118,118,128,0.24)] p-4">
                <p className="text-[16px] font-semibold text-white">No credit cards imported</p>
                <p className="mt-2 text-sm leading-6 text-white/64">This Plaid connection did not return a credit card account. Connect a credit card account to add it to this wallet.</p>
              </div>
            )}

            {plaidError && (
              <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-sm leading-5 text-rose-50/90">
                {plaidError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setPendingLinkedAccounts([]);
                  closeAddCardSheet();
                  showConnectedAccounts();
                }}
                className="rounded-full bg-white/10 px-4 py-3 text-sm font-medium text-white/82 transition hover:bg-white/14"
              >
                Review all
              </button>
              <button
                type="button"
                onClick={finishLinkedCardSetup}
                className="rounded-full bg-white px-4 py-3 text-sm font-medium text-[#060816] transition hover:opacity-95"
              >
                Finish
              </button>
            </div>
          </div>
        )}

        {scanStep === 'camera' && (
          <div className="mt-5 rounded-[30px] border border-white/12 bg-[rgba(118,118,128,0.24)] p-4" style={appleInfoFontStyle}>
            <div className="aspect-[0.68] rounded-[26px] border border-white/12 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_30%),linear-gradient(180deg,#1c2230_0%,#070a0f_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <p className="text-[10px] uppercase tracking-[0.24em] text-white/60">Camera view</p>
              <div className="mt-6 rounded-[24px] border-2 border-white/24 p-5 text-center text-sm leading-6 text-white/72">
                Frame the front of your card here. We’ll detect issuer, last four, and likely product name.
              </div>
              <div className="mt-6 rounded-2xl bg-white/10 px-3 py-2 text-sm text-white/78">Detected: premium Amex profile + card ending in 9999</div>
            </div>
            <button type="button" onClick={finishManualCardAdd} className="mt-4 w-full rounded-full bg-white px-4 py-3 text-sm font-medium text-[#060816] transition hover:opacity-95">Use detection</button>
          </div>
        )}

        {scanStep === 'manual' && (
          <div className="mt-5 space-y-3" style={appleInfoFontStyle}>
            {isUserBackedWallet ? (
              <div className="rounded-[28px] border border-white/12 bg-[rgba(118,118,128,0.24)] p-4">
                <label className="text-[10px] uppercase tracking-[0.24em] text-white/60" htmlFor="manual-card-product">
                  Card product
                </label>
                <select
                  id="manual-card-product"
                  value={effectiveManualCardProductId}
                  disabled={cardProducts.length === 0 || manualCardStatus === 'saving'}
                  onChange={(event) => setManualCardProductId(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/12 bg-[#11151f] px-4 py-3 text-white outline-none transition focus:border-white/20 disabled:opacity-60"
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
              </div>
            ) : (
              <>
                <div className="rounded-[28px] border border-white/12 bg-[rgba(118,118,128,0.24)] p-4">
                  <label className="text-[10px] uppercase tracking-[0.24em] text-white/60">Issuer</label>
                  <input value={draftCard.issuer} onChange={(event) => setDraftIssuer(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-white/20" />
                </div>
                <div className="rounded-[28px] border border-white/12 bg-[rgba(118,118,128,0.24)] p-4">
                  <label className="text-[10px] uppercase tracking-[0.24em] text-white/60">Product name</label>
                  <input value={draftCard.name} onChange={(event) => setDraftName(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-white/20" />
                </div>
              </>
            )}
            <div className="rounded-[28px] border border-white/12 bg-[rgba(118,118,128,0.24)] p-4">
              <label className="text-[10px] uppercase tracking-[0.24em] text-white/60">Last four</label>
              <input value={draftCard.last4} inputMode="numeric" maxLength={4} onChange={(event) => setDraftLast4(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-white/20" />
            </div>
            <div className="rounded-[28px] border border-white/12 bg-[rgba(118,118,128,0.24)] p-4">
              <p className="text-[10px] uppercase tracking-[0.24em] text-white/60">Preview</p>
              <div className={`mt-3 overflow-hidden rounded-[24px] bg-gradient-to-br ${previewGradient} p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]`}>
                <div className="flex items-start justify-between gap-3 text-white">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/66">
                      {isUserBackedWallet && selectedManualCardProduct ? selectedManualCardProduct.issuer : draftCard.issuer}
                    </p>
                    <p className="mt-5 text-[20px] font-semibold tracking-[-0.02em]">
                      {isUserBackedWallet && selectedManualCardProduct ? selectedManualCardProduct.name : draftCard.name}
                    </p>
                  </div>
                  <p className="text-xs text-white/72">•••• {draftCard.last4 || '0000'}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-white/[0.06] px-3 py-2">
                  <p className="text-[11px] text-white/42">Where it saves</p>
                  <p className="mt-1 text-[13px] font-semibold text-white">{isUserBackedWallet ? 'Profile wallet' : 'Demo wallet'}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.06] px-3 py-2">
                  <p className="text-[11px] text-white/42">Used by</p>
                  <p className="mt-1 text-[13px] font-semibold text-white">Analysis + Use Now</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/70">
                {isUserBackedWallet
                  ? 'This creates a manual account match so recommendations can use the card immediately, even before Plaid history exists.'
                  : 'This adds the card to the prototype stack for a fast demo.'}
              </p>
            </div>
            {manualCardStatus === 'saved' && (
              <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-sm leading-5 text-emerald-50/90">
                Card saved. Wallet analysis is refreshing and the card is ready for Use Now recommendations.
              </div>
            )}
            {manualCardStatus === 'error' && plaidError && (
              <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-sm leading-5 text-rose-50/90">
                {plaidError}
              </div>
            )}
            <button
              type="button"
              onClick={finishManualCardAdd}
              disabled={!manualSubmitEnabled}
              className="w-full rounded-full bg-white px-4 py-3 text-sm font-medium text-[#060816] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {manualCardStatus === 'saving' ? 'Saving card...' : 'Add card'}
            </button>
          </div>
        )}

        {scanStep === 'success' && (
          <div className="mt-8 rounded-[28px] border border-emerald-400/20 bg-emerald-400/10 p-6 text-center transition-all duration-300">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-300/20 text-2xl text-white">✓</div>
            <p className="mt-4 text-xl font-semibold text-white">{plaidStatus === 'connected' ? 'Plaid connected' : `${draftCard.name} added`}</p>
            <p className="mt-2 text-sm text-white/70">Ready for wallet analysis and Use Now recommendations.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

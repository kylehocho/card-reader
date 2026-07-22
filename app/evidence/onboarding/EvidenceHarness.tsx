'use client';

import AddCardSheet from '@/components/card-reader/AddCardSheet';
import type { CardProductSuggestion, MatchSaveState } from '@/components/card-reader/AccountMatchSuggestionCard';
import type { PlaidConnectedAccount } from '@/components/card-reader/types';
import type { ManualCardDraft, ScanStep } from '@/components/card-reader/useAddCardPresentation';
import type { CardProductRow } from '@/components/card-reader/usePersistedPlaidData';
import { buildWalletSelectionOutcomeSummary } from '@/components/card-reader/useWalletNavigation';
import ProfileAccessBoundary from '@/components/profile/ProfileAccessBoundary';
import type { AuthFlow, ProfileSetupInput, UserIdentity } from '@/components/auth/types';
import { useMemo } from 'react';

type EvidenceState =
  | 'manual-card'
  | 'plaid-match'
  | 'selection-outcomes'
  | 'auth-entry'
  | 'email-verify'
  | 'profile-setup';

type EvidenceHarnessProps = {
  state: string;
};

const states: EvidenceState[] = ['manual-card', 'plaid-match', 'selection-outcomes', 'auth-entry', 'email-verify', 'profile-setup'];

const cardProducts = [
  {
    id: 'amex-gold',
    issuer: 'American Express',
    name: 'Gold Card',
    reward_currency: 'Membership Rewards',
  },
  {
    id: 'chase-sapphire-reserve',
    issuer: 'Chase',
    name: 'Sapphire Reserve',
    reward_currency: 'Ultimate Rewards',
  },
  {
    id: 'capital-one-venture-x',
    issuer: 'Capital One',
    name: 'Venture X',
    reward_currency: 'Capital One Miles',
  },
] as unknown as CardProductRow[];

const pendingAccount: PlaidConnectedAccount = {
  accountId: 'acct_amex_gold',
  institutionName: 'American Express',
  name: 'American Express Gold Card',
  mask: '3007',
  type: 'credit',
  subtype: 'credit card',
  currentBalance: 1284,
  limit: 15000,
  matchStatus: 'suggested',
};

const reserveAccount: PlaidConnectedAccount = {
  accountId: 'acct_reserve',
  institutionName: 'Chase',
  name: 'Chase Sapphire Reserve',
  mask: '1184',
  type: 'credit',
  subtype: 'credit card',
  currentBalance: 940,
  limit: 24000,
  matchStatus: 'matched',
};

const matchSuggestion: CardProductSuggestion = {
  product: cardProducts[0],
  confidence: 0.94,
  reason: 'Issuer, account name, and mask pattern align with the top-priority Amex Gold catalog product.',
};

const draftCard: ManualCardDraft = {
  issuer: 'American Express',
  name: 'Gold Card',
  last4: '3007',
  isBusiness: false,
};

const evidenceUser: UserIdentity = {
  id: 'evidence-user',
  email: 'kyle@example.com',
  firstName: 'Kyle',
  displayName: 'Kyle Harrison',
  providers: ['email'],
};

function normalizeState(value: string): EvidenceState {
  return states.includes(value as EvidenceState) ? (value as EvidenceState) : 'manual-card';
}

function authFlowForState(state: EvidenceState): AuthFlow {
  if (state === 'auth-entry') return 'entry';
  if (state === 'email-verify') return 'verify';
  if (state === 'profile-setup') return 'setup';
  return 'closed';
}

function scanStepForState(state: EvidenceState): ScanStep | null {
  if (state === 'manual-card') return 'manual';
  if (state === 'plaid-match') return 'match';
  return null;
}

async function noopPromise() {}

export default function EvidenceHarness({ state: stateParam }: EvidenceHarnessProps) {
  const state = normalizeState(stateParam);
  const scanStep = scanStepForState(state);
  const authFlow = authFlowForState(state);
  const matchSuggestionByAccountId = useMemo(
    () => new Map<string, CardProductSuggestion | null>([[pendingAccount.accountId, matchSuggestion]]),
    [],
  );
  const matchStatusByAccount: Record<string, MatchSaveState> = {
    [pendingAccount.accountId]: 'idle',
  };
  const selectionOutcomes = buildWalletSelectionOutcomeSummary({
    fallbackSelectedId: 'amex-gold',
    manualAccount: pendingAccount,
    matchedAccount: pendingAccount,
    plaidLinkedAccounts: [pendingAccount, reserveAccount],
    remainingAccountsAfterRemoval: [reserveAccount],
    removedAccount: pendingAccount,
    selectedId: 'plaid-acct_amex_gold',
  });

  return (
    <main className="min-h-screen overflow-hidden bg-[#080a0f] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.14),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.10),transparent_28%)]" />
      {state !== 'selection-outcomes' && (
        <section className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/44">Card Reader evidence</p>
          <h1 className="mt-3 text-[30px] font-semibold tracking-[-0.03em]">Onboarding boundary visual baseline</h1>
          <p className="mt-3 text-sm leading-6 text-white/62">
            Deterministic fixture route for AddCardSheet and ProfileAccessBoundary screenshots.
          </p>
        </section>
      )}

      {state === 'selection-outcomes' && (
        <section className="absolute inset-x-4 top-1/2 mx-auto max-w-md -translate-y-1/2 rounded-[8px] border border-white/10 bg-[#111827] p-5 shadow-2xl shadow-black/30">
          <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-200/70">Signed-in onboarding</p>
          <h2 className="mt-2 text-xl font-semibold tracking-normal text-white">Selection outcome baseline</h2>
          <div className="mt-4 space-y-3">
            {selectionOutcomes.map((outcome) => (
              <article key={outcome.id} className="rounded-[8px] border border-white/10 bg-white/[0.04] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{outcome.label}</h3>
                    <p className="mt-1 break-all text-xs text-white/58">{outcome.selectedId}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-300/12 px-2 py-1 text-[10px] font-medium text-emerald-100">
                    selected
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-white/58">
                  {outcome.screen && (
                    <div>
                      <dt className="text-white/36">Screen</dt>
                      <dd className="mt-0.5 text-white/78">{outcome.screen}</dd>
                    </div>
                  )}
                  {outcome.scanStep && (
                    <div>
                      <dt className="text-white/36">Scan step</dt>
                      <dd className="mt-0.5 text-white/78">{outcome.scanStep}</dd>
                    </div>
                  )}
                  {outcome.walletPageIndex !== undefined && (
                    <div>
                      <dt className="text-white/36">Page index</dt>
                      <dd className="mt-0.5 text-white/78">{outcome.walletPageIndex}</dd>
                    </div>
                  )}
                  {outcome.manualCardStatus && (
                    <div>
                      <dt className="text-white/36">Manual status</dt>
                      <dd className="mt-0.5 text-white/78">{outcome.manualCardStatus}</dd>
                    </div>
                  )}
                </dl>
              </article>
            ))}
          </div>
        </section>
      )}

      {scanStep && (
        <AddCardSheet
          cardProducts={cardProducts}
          closeAddCardSheet={() => {}}
          connectPlaidSandbox={() => {}}
          draftCard={draftCard}
          effectiveManualCardProductId="amex-gold"
          finishLinkedCardSetup={() => {}}
          finishManualCardAdd={() => {}}
          isUserBackedWallet
          manualCardStatus="idle"
          matchStatusByAccount={matchStatusByAccount}
          matchSuggestionByAccountId={matchSuggestionByAccountId}
          pendingLinkedAccounts={[pendingAccount]}
          plaidAccounts={[pendingAccount]}
          plaidError={null}
          plaidStatus={state === 'plaid-match' ? 'connected' : 'idle'}
          previewGradient="from-[#f3d59f] via-[#cb9d62] to-[#704624]"
          scanStep={scanStep}
          selectedManualCardProduct={cardProducts[0]}
          setDraftBusiness={() => {}}
          setDraftIssuer={() => {}}
          setDraftLast4={() => {}}
          setDraftName={() => {}}
          setManualCardProductId={() => {}}
          setPendingLinkedAccounts={() => {}}
          setScanStep={() => {}}
          showConnectedAccounts={() => {}}
          updateCardMatch={noopPromise}
        />
      )}

      <ProfileAccessBoundary
        authFlow={authFlow}
        authStatus="authenticated"
        emailDraft="kyle@example.com"
        user={evidenceUser}
        onAuthFlowChange={() => {}}
        onEmailDraftChange={() => {}}
        onContinueWithApple={noopPromise}
        onContinueWithGoogle={noopPromise}
        onContinueWithEmail={noopPromise}
        onConfirmEmail={noopPromise}
        onCompleteProfileSetup={async (input: ProfileSetupInput) => {
          void input;
        }}
      />
    </main>
  );
}

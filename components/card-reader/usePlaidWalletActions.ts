'use client';

import { useCallback, useState } from 'react';
import type { PlaidConnectedAccount } from '@/components/card-reader/types';
import {
  accountFromSavedRow,
  type CardProductRow,
  type PlaidAccountRow,
} from '@/components/card-reader/usePersistedPlaidData';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';

type PlaidLinkMetadata = {
  institution?: {
    institution_id?: string | null;
    name?: string | null;
  } | null;
};

type PlaidApiAccount = {
  account_id: string;
  name: string;
  official_name: string | null;
  mask: string | null;
  type: string;
  subtype: string | null;
  balances: {
    available: number | null;
    current: number | null;
    limit: number | null;
    iso_currency_code: string | null;
  };
};

type PlaidExchangeResponse = {
  itemId: string;
  accounts: PlaidApiAccount[];
  savedAccounts?: PlaidAccountRow[];
  error?: string;
};

type ManualCardResponse = {
  account?: PlaidAccountRow;
  product?: Pick<CardProductRow, 'id' | 'issuer' | 'name'>;
  error?: string;
};

type PlaidHandler = {
  open: () => void;
  exit: () => void;
};

declare global {
  interface Window {
    Plaid?: {
      create: (options: {
        token: string;
        onSuccess: (publicToken: string, metadata: PlaidLinkMetadata) => void;
        onExit?: (error: unknown) => void;
      }) => PlaidHandler;
    };
  }
}

type PlaidStatus = 'idle' | 'loading' | 'connected' | 'error';
type ManualCardStatus = 'idle' | 'saving' | 'saved' | 'error';
type MatchStatus = 'idle' | 'saving' | 'saved' | 'error';
type TransactionSyncStatus = 'idle' | 'syncing' | 'error';

type ManualCardDraft = {
  name: string;
  last4: string;
};

type ManualCardPayload = {
  cardProductId: string;
  selectedProduct: Pick<CardProductRow, 'id' | 'issuer' | 'name'> | null;
  draftCard: ManualCardDraft;
};

type UsePlaidWalletActionsOptions = {
  user: { id: string } | null;
  plaidAccounts: PlaidConnectedAccount[];
  cardProducts: CardProductRow[];
  syncPlaidAccountsToWallet: (accounts: PlaidConnectedAccount[]) => void;
  loadPersistedPlaidState: () => Promise<void>;
  loadWalletAnalysis: () => Promise<void>;
  setAuthFlow: (flow: 'entry') => void;
  setPlaidError: (error: string | null) => void;
  setPlaidStatus: (status: PlaidStatus) => void;
  onManualCardAdded: (account: PlaidConnectedAccount) => void;
  onPlaidAccountsLinked: (accounts: PlaidConnectedAccount[]) => void;
  onCardMatchSaved: (account: PlaidConnectedAccount) => void;
  onConnectedAccountRemoved: (account: PlaidConnectedAccount, remainingAccounts: PlaidConnectedAccount[]) => void;
};

export function buildConnectedAccountsFromPlaidExchange(exchangeData: PlaidExchangeResponse, metadata: PlaidLinkMetadata): PlaidConnectedAccount[] {
  const institutionName = metadata.institution?.name ?? 'Plaid Sandbox';
  const connectedAccounts = exchangeData.savedAccounts?.length
    ? exchangeData.savedAccounts.map((account) => accountFromSavedRow(account, institutionName))
    : exchangeData.accounts.map((account) => ({
        accountId: account.account_id,
        institutionName,
        name: account.official_name ?? account.name,
        mask: account.mask ?? '0000',
        type: account.type,
        subtype: account.subtype ?? 'account',
        currentBalance: account.balances.current,
        limit: account.balances.limit,
      }));

  return connectedAccounts.filter((account) => account.type === 'credit' && account.subtype === 'credit card');
}

export function applyCardProductMatch(
  accounts: PlaidConnectedAccount[],
  accountToUpdate: PlaidConnectedAccount,
  cardProductId: string,
  selectedProduct: Pick<CardProductRow, 'id' | 'issuer' | 'name'> | null,
  source: 'manual' | 'suggested',
) {
  return accounts.map((account) =>
    account.accountId === accountToUpdate.accountId
      ? {
          ...account,
          cardProductId,
          cardProductName: selectedProduct?.name ?? null,
          cardProductIssuer: selectedProduct?.issuer ?? null,
          matchStatus: source,
        }
      : account,
  );
}

export function removeAccountFromList(accounts: PlaidConnectedAccount[], accountToRemove: PlaidConnectedAccount) {
  return accounts.filter((account) => account.accountId !== accountToRemove.accountId);
}

export function removeAccountStatus(statuses: Record<string, MatchStatus>, account: PlaidConnectedAccount) {
  const next = { ...statuses };
  delete next[account.accountId];
  return next;
}

async function getAccessTokenOrThrow(message: string) {
  const supabase = getBrowserSupabaseClient();
  const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error(message);
  return { supabase, accessToken };
}

export function usePlaidWalletActions({
  user,
  plaidAccounts,
  cardProducts,
  syncPlaidAccountsToWallet,
  loadPersistedPlaidState,
  loadWalletAnalysis,
  setAuthFlow,
  setPlaidError,
  setPlaidStatus,
  onManualCardAdded,
  onPlaidAccountsLinked,
  onCardMatchSaved,
  onConnectedAccountRemoved,
}: UsePlaidWalletActionsOptions) {
  const [manualCardStatus, setManualCardStatus] = useState<ManualCardStatus>('idle');
  const [matchStatusByAccount, setMatchStatusByAccount] = useState<Record<string, MatchStatus>>({});
  const [editingMatchAccountIds, setEditingMatchAccountIds] = useState<string[]>([]);
  const [removingAccountIds, setRemovingAccountIds] = useState<string[]>([]);
  const [accountPendingRemoval, setAccountPendingRemoval] = useState<PlaidConnectedAccount | null>(null);
  const [transactionSyncStatus, setTransactionSyncStatus] = useState<TransactionSyncStatus>('idle');
  const [pendingLinkedAccounts, setPendingLinkedAccounts] = useState<PlaidConnectedAccount[]>([]);

  const finishManualCardAdd = useCallback(
    async ({ cardProductId, selectedProduct, draftCard }: ManualCardPayload) => {
      if (!cardProductId) {
        setPlaidError('Choose a card product before adding it manually.');
        return;
      }

      setManualCardStatus('saving');
      setPlaidError(null);

      try {
        const { accessToken } = await getAccessTokenOrThrow('Sign in before adding a manual card.');
        const response = await fetch('/api/wallet/manual-cards', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + accessToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cardProductId,
            last4: draftCard.last4,
            label: selectedProduct?.name ?? draftCard.name,
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as ManualCardResponse;

        if (!response.ok || !payload.account || !payload.product) {
          throw new Error(payload.error ?? 'Unable to add manual card.');
        }

        const addedAccount: PlaidConnectedAccount = {
          ...accountFromSavedRow(payload.account, 'Manual cards'),
          cardProductId: payload.product.id,
          cardProductName: payload.product.name,
          cardProductIssuer: payload.product.issuer,
          matchStatus: 'manual',
        };
        const nextAccounts = [...removeAccountFromList(plaidAccounts, addedAccount), addedAccount];

        syncPlaidAccountsToWallet(nextAccounts);
        setManualCardStatus('saved');
        setPlaidStatus('connected');
        void loadPersistedPlaidState();
        void loadWalletAnalysis();
        onManualCardAdded(addedAccount);
      } catch (error) {
        if (error instanceof Error && error.message === 'Sign in before adding a manual card.') {
          setAuthFlow('entry');
        }
        setManualCardStatus('error');
        setPlaidError(error instanceof Error ? error.message : 'Unable to add manual card.');
      }
    },
    [loadPersistedPlaidState, loadWalletAnalysis, onManualCardAdded, plaidAccounts, setAuthFlow, setPlaidError, setPlaidStatus, syncPlaidAccountsToWallet],
  );

  const connectPlaidSandbox = useCallback(
    async (loadPlaidLinkScript: () => Promise<void>) => {
      setPlaidStatus('loading');
      setPlaidError(null);
      setPendingLinkedAccounts([]);

      try {
        const { accessToken } = await getAccessTokenOrThrow('Sign in before connecting Plaid.');
        const authHeaders = { Authorization: 'Bearer ' + accessToken };
        const linkTokenResponse = await fetch('/api/plaid/link-token', { method: 'POST', headers: authHeaders });
        const linkTokenData = (await linkTokenResponse.json()) as { linkToken?: string; error?: string };

        if (!linkTokenResponse.ok || !linkTokenData.linkToken) {
          throw new Error(linkTokenData.error ?? 'Unable to create Plaid Link token.');
        }

        await loadPlaidLinkScript();
        if (!window.Plaid) throw new Error('Plaid Link did not load.');

        const handler = window.Plaid.create({
          token: linkTokenData.linkToken,
          onSuccess: async (publicToken, metadata) => {
            try {
              const exchangeResponse = await fetch('/api/plaid/exchange-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify({
                  publicToken,
                  institutionId: metadata.institution?.institution_id ?? null,
                  institutionName: metadata.institution?.name ?? null,
                }),
              });
              const exchangeData = (await exchangeResponse.json()) as PlaidExchangeResponse;

              if (!exchangeResponse.ok) {
                throw new Error(exchangeData.error ?? 'Unable to exchange Plaid token.');
              }

              const accountsToAdd = buildConnectedAccountsFromPlaidExchange(exchangeData, metadata);

              syncPlaidAccountsToWallet(accountsToAdd);
              setPendingLinkedAccounts(accountsToAdd);
              setPlaidStatus('connected');
              void loadPersistedPlaidState();
              onPlaidAccountsLinked(accountsToAdd);
            } catch (error) {
              setPlaidStatus('error');
              setPlaidError(error instanceof Error ? error.message : 'Plaid token exchange failed.');
            }
          },
          onExit: (error) => {
            setPlaidStatus(error ? 'error' : 'idle');
            if (error) setPlaidError('Plaid Link was closed before the connection finished.');
          },
        });

        handler.open();
      } catch (error) {
        if (error instanceof Error && error.message === 'Sign in before connecting Plaid.') {
          setAuthFlow('entry');
        }
        setPlaidStatus('error');
        setPlaidError(error instanceof Error ? error.message : 'Plaid connection failed.');
      }
    },
    [loadPersistedPlaidState, onPlaidAccountsLinked, setAuthFlow, setPlaidError, setPlaidStatus, syncPlaidAccountsToWallet],
  );

  const updateCardMatch = useCallback(
    async (account: PlaidConnectedAccount, cardProductId: string, source: 'manual' | 'suggested' = 'manual', confidence = 1) => {
      if (!user || !account.dbId) {
        setPlaidError('Reconnect this Plaid account before saving a card match.');
        return;
      }

      const supabase = getBrowserSupabaseClient();
      if (!supabase) return;

      setMatchStatusByAccount((current) => ({ ...current, [account.accountId]: 'saving' }));
      setPlaidError(null);

      const selectedProduct = cardProducts.find((product) => product.id === cardProductId) ?? null;
      const { error } = await supabase.from('account_card_matches').upsert(
        {
          user_id: user.id,
          plaid_account_id: account.dbId,
          card_product_id: cardProductId,
          match_status: source,
          match_confidence: confidence,
        },
        { onConflict: 'user_id,plaid_account_id' },
      );

      if (error) {
        console.error('Unable to save card match', error);
        setMatchStatusByAccount((current) => ({ ...current, [account.accountId]: 'error' }));
        setPlaidError(error.message);
        return;
      }

      const nextAccounts = applyCardProductMatch(plaidAccounts, account, cardProductId, selectedProduct, source);
      syncPlaidAccountsToWallet(nextAccounts);
      setPendingLinkedAccounts((currentAccounts) => applyCardProductMatch(currentAccounts, account, cardProductId, selectedProduct, source));
      setEditingMatchAccountIds((current) => current.filter((accountId) => accountId !== account.accountId));
      setMatchStatusByAccount((current) => ({ ...current, [account.accountId]: 'saved' }));
      void loadWalletAnalysis();
      onCardMatchSaved(account);
    },
    [cardProducts, loadWalletAnalysis, onCardMatchSaved, plaidAccounts, setPlaidError, syncPlaidAccountsToWallet, user],
  );

  const requestRemoveConnectedAccount = useCallback((account: PlaidConnectedAccount) => {
    setAccountPendingRemoval(account);
  }, []);

  const removeConnectedAccount = useCallback(
    async (account: PlaidConnectedAccount) => {
      if (!user || !account.dbId) {
        setPlaidError('Sign in again before removing this connected account.');
        return;
      }

      const supabase = getBrowserSupabaseClient();
      if (!supabase) return;

      setRemovingAccountIds((current) => [...new Set([...current, account.accountId])]);
      setPlaidError(null);

      try {
        const { accessToken } = await getAccessTokenOrThrow('Sign in again before removing this connected account.');
        const response = await fetch('/api/plaid/remove-account', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + accessToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ plaidAccountId: account.dbId }),
        });
        const payload = (await response.json().catch(() => ({}))) as { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? 'Unable to remove connected account.');
        }

        const nextAccounts = removeAccountFromList(plaidAccounts, account);
        syncPlaidAccountsToWallet(nextAccounts);
        setPendingLinkedAccounts((currentAccounts) => removeAccountFromList(currentAccounts, account));
        setEditingMatchAccountIds((current) => current.filter((accountId) => accountId !== account.accountId));
        setMatchStatusByAccount((current) => removeAccountStatus(current, account));
        void loadWalletAnalysis();
        onConnectedAccountRemoved(account, nextAccounts);
      } catch (error) {
        setPlaidError(error instanceof Error ? error.message : 'Unable to remove connected account.');
      } finally {
        setRemovingAccountIds((current) => current.filter((accountId) => accountId !== account.accountId));
        setAccountPendingRemoval((current) => (current?.accountId === account.accountId ? null : current));
      }
    },
    [loadWalletAnalysis, onConnectedAccountRemoved, plaidAccounts, setPlaidError, syncPlaidAccountsToWallet, user],
  );

  const syncPlaidTransactions = useCallback(async () => {
    try {
      const { accessToken } = await getAccessTokenOrThrow('Sign in again before syncing Plaid transactions.');

      setTransactionSyncStatus('syncing');
      setPlaidError(null);

      const response = await fetch('/api/plaid/sync-transactions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ days: 90 }),
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? 'Unable to sync Plaid transactions.');
      }

      await loadPersistedPlaidState();
      void loadWalletAnalysis();
      setTransactionSyncStatus('idle');
    } catch (error) {
      if (error instanceof Error && error.message === 'Sign in again before syncing Plaid transactions.') {
        setAuthFlow('entry');
        return;
      }
      setTransactionSyncStatus('error');
      setPlaidError(error instanceof Error ? error.message : 'Unable to sync Plaid transactions.');
    }
  }, [loadPersistedPlaidState, loadWalletAnalysis, setAuthFlow, setPlaidError]);

  return {
    accountPendingRemoval,
    connectPlaidSandbox,
    editingMatchAccountIds,
    finishManualCardAdd,
    manualCardStatus,
    matchStatusByAccount,
    pendingLinkedAccounts,
    removingAccountIds,
    requestRemoveConnectedAccount,
    removeConnectedAccount,
    setAccountPendingRemoval,
    setEditingMatchAccountIds,
    setManualCardStatus,
    setPendingLinkedAccounts,
    setPlaidError,
    setPlaidStatus,
    setTransactionSyncStatus,
    syncPlaidTransactions,
    transactionSyncStatus,
    updateCardMatch,
  };
}

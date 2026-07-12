'use client';

import type { PlaidConnectedAccount, Transaction } from '@/components/card-reader/types';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';
import { useCallback, useEffect, useState } from 'react';

export type PlaidAccountRow = Database['public']['Tables']['plaid_accounts']['Row'];
export type PlaidTransactionRow = Database['public']['Tables']['plaid_transactions']['Row'];
export type CardProductRow = Database['public']['Tables']['card_products']['Row'];
export type AccountCardMatchRow = Database['public']['Tables']['account_card_matches']['Row'];

export type PlaidAccountWithRelations = PlaidAccountRow & {
  plaid_items?: { institution_name: string | null } | null;
  account_card_matches?: (AccountCardMatchRow & {
    card_products?: Pick<CardProductRow, 'id' | 'issuer' | 'name'> | null;
  })[];
};

type PlaidStatus = 'idle' | 'loading' | 'connected' | 'error';

type UsePersistedPlaidDataOptions = {
  enabled: boolean;
  initialStatus: PlaidStatus;
  syncPlaidAccountsToWallet: (accounts: PlaidConnectedAccount[]) => void;
  loadWalletAnalysis: () => Promise<void>;
};

export function formatTransactionAmount(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatTransactionDate(value: string) {
  const date = new Date(value + 'T00:00:00');
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

export function transactionFromRow(row: PlaidTransactionRow): Transaction {
  return {
    id: row.id,
    merchant: row.merchant_name ?? row.name,
    amount: formatTransactionAmount(row.amount),
    date: formatTransactionDate(row.date),
    category: row.category[0] ?? 'Transaction',
  };
}

export function groupRecentTransactionsByAccountId(transactions: PlaidTransactionRow[]) {
  const transactionsByAccountId = new Map<string, Transaction[]>();

  for (const transaction of transactions) {
    if (!transaction.plaid_account_id) continue;
    const existing = transactionsByAccountId.get(transaction.plaid_account_id) ?? [];
    if (existing.length < 5) {
      existing.push(transactionFromRow(transaction));
      transactionsByAccountId.set(transaction.plaid_account_id, existing);
    }
  }

  return transactionsByAccountId;
}

export function accountFromPersistedRow(row: PlaidAccountWithRelations, transactionsByAccountId: Map<string, Transaction[]>): PlaidConnectedAccount {
  const match = row.account_card_matches?.[0] ?? null;
  const product = match?.card_products ?? null;

  return {
    dbId: row.id,
    accountId: row.account_id,
    institutionName: row.plaid_items?.institution_name ?? 'Plaid Sandbox',
    name: row.official_name ?? row.name,
    mask: row.mask ?? '0000',
    type: row.type,
    subtype: row.subtype ?? 'account',
    currentBalance: row.current_balance,
    limit: row.credit_limit,
    cardProductId: match?.card_product_id ?? null,
    cardProductName: product?.name ?? null,
    cardProductIssuer: product?.issuer ?? null,
    matchStatus: match?.match_status ?? null,
    recentTransactions: transactionsByAccountId.get(row.id) ?? [],
  };
}

export function accountFromSavedRow(row: PlaidAccountRow, institutionName: string): PlaidConnectedAccount {
  return {
    dbId: row.id,
    accountId: row.account_id,
    institutionName,
    name: row.official_name ?? row.name,
    mask: row.mask ?? '0000',
    type: row.type,
    subtype: row.subtype ?? 'account',
    currentBalance: row.current_balance,
    limit: row.credit_limit,
  };
}

export function usePersistedPlaidData({
  enabled,
  initialStatus,
  syncPlaidAccountsToWallet,
  loadWalletAnalysis,
}: UsePersistedPlaidDataOptions) {
  const [cardProducts, setCardProducts] = useState<CardProductRow[]>([]);
  const [plaidStatus, setPlaidStatus] = useState<PlaidStatus>(initialStatus);
  const [plaidError, setPlaidError] = useState<string | null>(null);
  const [plaidTransactions, setPlaidTransactions] = useState<PlaidTransactionRow[]>([]);

  const loadPersistedPlaidState = useCallback(async () => {
    if (!enabled) return;

    const supabase = getBrowserSupabaseClient();
    if (!supabase) return;

    const [
      { data: products, error: productsError },
      { data: accounts, error: accountsError },
      { data: transactions, error: transactionsError },
    ] = await Promise.all([
      supabase.from('card_products').select('*').order('issuer').order('name'),
      supabase
        .from('plaid_accounts')
        .select('*, plaid_items(institution_name), account_card_matches(*, card_products(id, issuer, name))')
        .eq('type', 'credit')
        .eq('subtype', 'credit card')
        .order('created_at', { ascending: true }),
      supabase.from('plaid_transactions').select('*').order('date', { ascending: false }).limit(100),
    ]);

    if (productsError || accountsError || transactionsError) {
      console.error('Unable to load Plaid account matching state', productsError ?? accountsError ?? transactionsError);
      setPlaidError(productsError?.message ?? accountsError?.message ?? transactionsError?.message ?? 'Unable to load connected accounts.');
      return;
    }

    const transactionRows = (transactions ?? []) as PlaidTransactionRow[];
    const transactionsByAccountId = groupRecentTransactionsByAccountId(transactionRows);
    const connectedAccounts = ((accounts ?? []) as PlaidAccountWithRelations[]).map((account) => accountFromPersistedRow(account, transactionsByAccountId));

    setCardProducts(products ?? []);
    setPlaidTransactions(transactionRows);
    syncPlaidAccountsToWallet(connectedAccounts);
    setPlaidStatus(connectedAccounts.length > 0 ? 'connected' : 'idle');
    void loadWalletAnalysis();
  }, [enabled, loadWalletAnalysis, syncPlaidAccountsToWallet]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPersistedPlaidState();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadPersistedPlaidState]);

  return {
    cardProducts,
    setCardProducts,
    plaidStatus,
    setPlaidStatus,
    plaidError,
    setPlaidError,
    plaidTransactions,
    setPlaidTransactions,
    loadPersistedPlaidState,
  };
}

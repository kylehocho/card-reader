import { NextResponse } from 'next/server';
import { analyzeWallet } from '@/lib/benefits/analyze-wallet';
import type { AnalysisAccount, AnalysisCardProduct, AnalysisTransaction, BenefitRule } from '@/lib/benefits/types';
import { getAuthenticatedUser } from '@/lib/supabase/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import type { Database, Json } from '@/lib/supabase/types';

type CardProductRow = Database['public']['Tables']['card_products']['Row'];
type PlaidAccountRow = Database['public']['Tables']['plaid_accounts']['Row'];
type AccountCardMatchRow = Database['public']['Tables']['account_card_matches']['Row'];
type PlaidTransactionRow = Database['public']['Tables']['plaid_transactions']['Row'];

function isObject(value: Json): value is { [key: string]: Json | undefined } {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toRewards(value: Json): Record<string, number> {
  if (!isObject(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, number] => typeof entry[1] === 'number')
      .map(([key, multiplier]) => [key, multiplier]),
  );
}

function toBenefits(value: Json): BenefitRule[] {
  if (!Array.isArray(value)) return [];

  return value.filter((rule): rule is BenefitRule => {
    if (!rule || typeof rule !== 'object' || Array.isArray(rule)) return false;
    const candidate = rule as { [key: string]: Json | undefined };
    return typeof candidate.id === 'string' && typeof candidate.type === 'string' && typeof candidate.title === 'string';
  });
}

function cardProductFromRow(row: CardProductRow): AnalysisCardProduct {
  return {
    id: row.id,
    issuer: row.issuer,
    name: row.name,
    annual_fee: row.annual_fee,
    reward_currency: row.reward_currency,
    rewards: toRewards(row.rewards),
    benefits: toBenefits(row.benefits),
  };
}

function accountFromRow(row: PlaidAccountRow, matchByAccountId: Map<string, AccountCardMatchRow>): AnalysisAccount {
  return {
    id: row.id,
    account_id: row.account_id,
    name: row.official_name ?? row.name,
    card_product_id: matchByAccountId.get(row.id)?.card_product_id ?? null,
  };
}

function transactionFromRow(row: PlaidTransactionRow): AnalysisTransaction {
  return {
    id: row.id,
    plaid_account_id: row.plaid_account_id,
    account_id: row.account_id,
    merchant_name: row.merchant_name,
    name: row.name,
    amount: row.amount,
    date: row.date,
    category: row.category,
    personal_finance_category: row.personal_finance_category,
    pending: row.pending,
  };
}

export async function GET(request: Request) {
  try {
    const { user, response: authResponse } = await getAuthenticatedUser(request);
    if (authResponse) return authResponse;

    const supabase = getSupabaseAdminClient();
    const [productsResult, accountsResult, matchesResult, transactionsResult] = await Promise.all([
      supabase.from('card_products').select('*').order('issuer', { ascending: true }).order('name', { ascending: true }),
      supabase.from('plaid_accounts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('account_card_matches').select('*').eq('user_id', user.id),
      supabase.from('plaid_transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(500),
    ]);

    const firstError = productsResult.error ?? accountsResult.error ?? matchesResult.error ?? transactionsResult.error;
    if (firstError) throw new Error(firstError.message);

    const cardProducts = (productsResult.data ?? []).map(cardProductFromRow);
    const matchByAccountId = new Map((matchesResult.data ?? []).map((match) => [match.plaid_account_id, match]));
    const accounts = (accountsResult.data ?? []).map((account) => accountFromRow(account, matchByAccountId));
    const transactions = (transactionsResult.data ?? []).map(transactionFromRow);
    const analysis = analyzeWallet({ cardProducts, accounts, transactions });

    return NextResponse.json({
      analysis,
      meta: {
        userId: user.id,
        cardProducts: cardProducts.length,
        linkedAccounts: accounts.length,
        matchedAccounts: accounts.filter((account) => Boolean(account.card_product_id)).length,
        transactions: transactions.length,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to analyze wallet.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

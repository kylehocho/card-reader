import { NextResponse } from 'next/server';
import { getPlaidClient } from '@/lib/plaid';
import { decryptSecret } from '@/lib/encryption';
import { getAuthenticatedUser } from '@/lib/supabase/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import type { Database, Json } from '@/lib/supabase/types';

type SyncTransactionsRequest = {
  plaidItemId?: string;
  days?: number;
};

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toJson(value: unknown): Json | null {
  if (value === null || value === undefined) return null;
  return JSON.parse(JSON.stringify(value)) as Json;
}

export async function POST(request: Request) {
  try {
    const { user, response: authResponse } = await getAuthenticatedUser(request);
    if (authResponse) return authResponse;

    const body = (await request.json().catch(() => ({}))) as SyncTransactionsRequest;
    const days = Math.min(Math.max(body.days ?? 60, 7), 730);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const supabase = getSupabaseAdminClient();
    const plaid = getPlaidClient();
    let itemQuery = supabase
      .from('plaid_items')
      .select('id,user_id,access_token_encrypted,status')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (body.plaidItemId) {
      itemQuery = itemQuery.eq('id', body.plaidItemId);
    }

    const { data: plaidItems, error: itemsError } = await itemQuery;
    if (itemsError) throw new Error(itemsError.message);

    const itemResults = [];
    let totalSaved = 0;

    for (const item of plaidItems ?? []) {
      const accessToken = decryptSecret(item.access_token_encrypted);
      const [transactionsResponse, { data: accounts, error: accountsError }] = await Promise.all([
        plaid.transactionsGet({
          access_token: accessToken,
          start_date: formatDate(startDate),
          end_date: formatDate(endDate),
          options: { count: 500, offset: 0 },
        }),
        supabase.from('plaid_accounts').select('id,account_id').eq('user_id', user.id).eq('plaid_item_id', item.id),
      ]);

      if (accountsError) throw new Error(accountsError.message);

      const accountIdByPlaidId = new Map((accounts ?? []).map((account) => [account.account_id, account.id]));
      const transactionsToSave: Database['public']['Tables']['plaid_transactions']['Insert'][] = transactionsResponse.data.transactions.map((transaction) => ({
        user_id: user.id,
        plaid_item_id: item.id,
        plaid_account_id: accountIdByPlaidId.get(transaction.account_id) ?? null,
        account_id: transaction.account_id,
        transaction_id: transaction.transaction_id,
        name: transaction.name,
        merchant_name: transaction.merchant_name ?? null,
        amount: transaction.amount,
        iso_currency_code: transaction.iso_currency_code ?? null,
        date: transaction.date,
        authorized_date: transaction.authorized_date ?? null,
        pending: transaction.pending,
        payment_channel: transaction.payment_channel ?? null,
        category: transaction.category ?? [],
        category_id: transaction.category_id ?? null,
        personal_finance_category: toJson(transaction.personal_finance_category),
      }));

      if (transactionsToSave.length > 0) {
        const { data: savedTransactions, error: transactionsError } = await supabase
          .from('plaid_transactions')
          .upsert(transactionsToSave, { onConflict: 'user_id,transaction_id' })
          .select('id');

        if (transactionsError) throw new Error(transactionsError.message);
        totalSaved += savedTransactions?.length ?? 0;
      }

      itemResults.push({
        plaidItemId: item.id,
        available: transactionsResponse.data.total_transactions,
        saved: transactionsToSave.length,
      });
    }

    return NextResponse.json({
      itemCount: plaidItems?.length ?? 0,
      totalSaved,
      items: itemResults,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to sync Plaid transactions.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

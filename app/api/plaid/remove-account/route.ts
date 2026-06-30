import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

type RemovePlaidAccountRequest = {
  plaidAccountId?: string;
};

export async function POST(request: Request) {
  try {
    const { user, response: authResponse } = await getAuthenticatedUser(request);
    if (authResponse) return authResponse;

    const body = (await request.json().catch(() => ({}))) as RemovePlaidAccountRequest;
    if (!body.plaidAccountId) {
      return NextResponse.json({ error: 'plaidAccountId is required.' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { data: account, error: accountError } = await supabase
      .from('plaid_accounts')
      .select('id,account_id,plaid_item_id')
      .eq('id', body.plaidAccountId)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Connected account was not found.' }, { status: 404 });
    }

    const { error: matchError } = await supabase.from('account_card_matches').delete().eq('plaid_account_id', account.id).eq('user_id', user.id);
    if (matchError) throw new Error(matchError.message);

    const { error: transactionError } = await supabase
      .from('plaid_transactions')
      .delete()
      .eq('plaid_account_id', account.id)
      .eq('user_id', user.id);
    if (transactionError) throw new Error(transactionError.message);

    const { error: accountDeleteError } = await supabase.from('plaid_accounts').delete().eq('id', account.id).eq('user_id', user.id);
    if (accountDeleteError) throw new Error(accountDeleteError.message);

    const { data: siblingAccounts, error: siblingError } = await supabase
      .from('plaid_accounts')
      .select('id')
      .eq('plaid_item_id', account.plaid_item_id)
      .eq('user_id', user.id)
      .limit(1);
    if (siblingError) throw new Error(siblingError.message);

    if ((siblingAccounts ?? []).length === 0) {
      const { error: itemError } = await supabase.from('plaid_items').delete().eq('id', account.plaid_item_id).eq('user_id', user.id);
      if (itemError) throw new Error(itemError.message);
    }

    return NextResponse.json({ removed: true, accountId: account.account_id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to remove connected account.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

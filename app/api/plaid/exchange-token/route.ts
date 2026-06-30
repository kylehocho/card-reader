import { NextResponse } from 'next/server';
import { getPlaidClient } from '@/lib/plaid';
import { encryptSecret } from '@/lib/encryption';
import { getAuthenticatedUser } from '@/lib/supabase/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

type ExchangeTokenRequest = {
  publicToken?: string;
  institutionId?: string | null;
  institutionName?: string | null;
};

type PlaidAccountLike = {
  type: string;
  subtype?: string | null;
};

function isCreditCardAccount(account: PlaidAccountLike) {
  return account.type === 'credit' && account.subtype === 'credit card';
}

export async function POST(request: Request) {
  try {
    const { user, response: authResponse } = await getAuthenticatedUser(request);
    if (authResponse) return authResponse;

    const body = (await request.json()) as ExchangeTokenRequest;

    if (!body.publicToken) {
      return NextResponse.json({ error: 'publicToken is required.' }, { status: 400 });
    }

    const plaid = getPlaidClient();
    const exchange = await plaid.itemPublicTokenExchange({
      public_token: body.publicToken,
    });
    const accessToken = exchange.data.access_token;
    const itemId = exchange.data.item_id;

    const [accountsResponse, liabilitiesResponse] = await Promise.all([
      plaid.accountsGet({ access_token: accessToken }),
      plaid.liabilitiesGet({ access_token: accessToken }).catch(() => null),
    ]);
    const creditCardAccounts = accountsResponse.data.accounts.filter(isCreditCardAccount);

    if (creditCardAccounts.length === 0) {
      await plaid.itemRemove({ access_token: accessToken }).catch(() => null);

      return NextResponse.json(
        {
          error: 'No credit card accounts were found for this Plaid connection. Connect a credit card account to import it into Card Reader.',
          importedAccounts: 0,
          skippedAccounts: accountsResponse.data.accounts.length,
        },
        { status: 422 },
      );
    }

    const supabase = getSupabaseAdminClient();
    const { data: plaidItem, error: itemError } = await supabase
      .from('plaid_items')
      .upsert(
        {
          user_id: user.id,
          item_id: itemId,
          institution_id: body.institutionId ?? accountsResponse.data.item.institution_id ?? null,
          institution_name: body.institutionName ?? null,
          access_token_encrypted: encryptSecret(accessToken),
          status: 'active',
        },
        { onConflict: 'user_id,item_id' },
      )
      .select('id')
      .single();

    if (itemError || !plaidItem) {
      throw new Error(itemError?.message ?? 'Unable to save Plaid item.');
    }

    const accountsToSave = creditCardAccounts.map((account) => ({
      user_id: user.id,
      plaid_item_id: plaidItem.id,
      account_id: account.account_id,
      name: account.name,
      official_name: account.official_name ?? null,
      mask: account.mask ?? null,
      type: account.type,
      subtype: account.subtype ?? null,
      current_balance: account.balances.current ?? null,
      available_balance: account.balances.available ?? null,
      credit_limit: account.balances.limit ?? null,
      iso_currency_code: account.balances.iso_currency_code ?? null,
    }));

    const { data: savedAccounts, error: accountsError } = await supabase
      .from('plaid_accounts')
      .upsert(accountsToSave, { onConflict: 'user_id,account_id' })
      .select('*');

    if (accountsError) {
      throw new Error(accountsError.message);
    }

    return NextResponse.json({
      itemId,
      savedItemId: plaidItem.id,
      accounts: creditCardAccounts,
      savedAccounts,
      importedAccounts: savedAccounts?.length ?? 0,
      skippedAccounts: accountsResponse.data.accounts.length - creditCardAccounts.length,
      liabilities: liabilitiesResponse?.data.liabilities ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to exchange Plaid public token.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

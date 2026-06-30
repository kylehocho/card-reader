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
  name?: string | null;
  official_name?: string | null;
  mask?: string | null;
  type: string;
  subtype?: string | null;
};

type ExistingPlaidAccount = {
  name: string | null;
  official_name: string | null;
  mask: string | null;
  type: string;
  subtype: string | null;
  plaid_items:
    | {
        institution_id: string | null;
        institution_name: string | null;
        status: string | null;
      }
    | {
        institution_id: string | null;
        institution_name: string | null;
        status: string | null;
      }[]
    | null;
};

function isCreditCardAccount(account: PlaidAccountLike) {
  return account.type === 'credit' && account.subtype === 'credit card';
}

function normalizeFingerprintPart(value?: string | null) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function accountFingerprint(account: PlaidAccountLike) {
  return [
    normalizeFingerprintPart(account.official_name ?? account.name),
    normalizeFingerprintPart(account.mask),
    normalizeFingerprintPart(account.subtype),
  ].join('|');
}

function relationOne<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
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
    const institutionId = body.institutionId ?? accountsResponse.data.item.institution_id ?? null;
    const institutionName = body.institutionName ?? null;

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
    const { data: existingAccounts, error: existingAccountsError } = await supabase
      .from('plaid_accounts')
      .select('name,official_name,mask,type,subtype,plaid_items(institution_id,institution_name,status)')
      .eq('user_id', user.id)
      .eq('type', 'credit')
      .eq('subtype', 'credit card');

    if (existingAccountsError) {
      throw new Error(existingAccountsError.message);
    }

    const existingFingerprints = new Set(
      ((existingAccounts ?? []) as ExistingPlaidAccount[])
        .filter((account) => {
          const item = relationOne(account.plaid_items);
          if (!item || item.status !== 'active') return false;
          const sameInstitutionId = institutionId && item.institution_id === institutionId;
          const sameInstitutionName = institutionName && normalizeFingerprintPart(item.institution_name) === normalizeFingerprintPart(institutionName);
          return sameInstitutionId || sameInstitutionName;
        })
        .map(accountFingerprint),
    );
    const newCreditCardAccounts = creditCardAccounts.filter((account) => !existingFingerprints.has(accountFingerprint(account)));

    if (newCreditCardAccounts.length === 0) {
      await plaid.itemRemove({ access_token: accessToken }).catch(() => null);

      return NextResponse.json(
        {
          error: 'This Plaid credit card connection is already linked.',
          importedAccounts: 0,
          skippedAccounts: accountsResponse.data.accounts.length - creditCardAccounts.length,
          skippedDuplicateAccounts: creditCardAccounts.length,
        },
        { status: 409 },
      );
    }

    const { data: plaidItem, error: itemError } = await supabase
      .from('plaid_items')
      .upsert(
        {
          user_id: user.id,
          item_id: itemId,
          institution_id: institutionId,
          institution_name: institutionName,
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

    const accountsToSave = newCreditCardAccounts.map((account) => ({
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
      accounts: newCreditCardAccounts,
      savedAccounts,
      importedAccounts: savedAccounts?.length ?? 0,
      skippedAccounts: accountsResponse.data.accounts.length - creditCardAccounts.length,
      skippedDuplicateAccounts: creditCardAccounts.length - newCreditCardAccounts.length,
      liabilities: liabilitiesResponse?.data.liabilities ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to exchange Plaid public token.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

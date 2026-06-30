import { NextResponse } from 'next/server';
import { getPlaidClient, plaidCountryCodes, plaidCreditCardAccountFilters, plaidProducts } from '@/lib/plaid';
import { getAuthenticatedUser } from '@/lib/supabase/auth';

export async function POST(request: Request) {
  try {
    const { user, response: authResponse } = await getAuthenticatedUser(request);
    if (authResponse) return authResponse;

    const plaid = getPlaidClient();
    const linkTokenResponse = await plaid.linkTokenCreate({
      client_name: 'Card Reader',
      country_codes: plaidCountryCodes,
      language: 'en',
      products: plaidProducts,
      account_filters: plaidCreditCardAccountFilters,
      user: {
        client_user_id: user.id,
      },
    });

    return NextResponse.json({ linkToken: linkTokenResponse.data.link_token });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create Plaid Link token.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

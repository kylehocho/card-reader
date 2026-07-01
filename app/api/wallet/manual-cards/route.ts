import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

type ManualCardRequest = {
  cardProductId?: string;
  last4?: string;
  label?: string | null;
};

type CardProductRow = Pick<Database['public']['Tables']['card_products']['Row'], 'id' | 'issuer' | 'name'>;

function normalizeLast4(value: unknown) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 4);
}

function manualAccountId(cardProductId: string, last4: string) {
  return `manual:${cardProductId}:${last4}`;
}

export async function POST(request: Request) {
  try {
    const { user, response: authResponse } = await getAuthenticatedUser(request);
    if (authResponse) return authResponse;

    const body = (await request.json().catch(() => ({}))) as ManualCardRequest;
    const cardProductId = body.cardProductId?.trim();
    const last4 = normalizeLast4(body.last4);

    if (!cardProductId) {
      return NextResponse.json({ error: 'cardProductId is required.' }, { status: 400 });
    }

    if (last4.length !== 4) {
      return NextResponse.json({ error: 'last4 must contain exactly four digits.' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { data: product, error: productError } = await supabase
      .from('card_products')
      .select('id,issuer,name')
      .eq('id', cardProductId)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'Card product was not found.' }, { status: 404 });
    }

    const typedProduct = product as CardProductRow;
    const { data: plaidItem, error: itemError } = await supabase
      .from('plaid_items')
      .upsert(
        {
          user_id: user.id,
          item_id: `manual-wallet:${user.id}`,
          institution_id: null,
          institution_name: 'Manual cards',
          access_token_encrypted: 'manual-card',
          status: 'manual',
        },
        { onConflict: 'user_id,item_id' },
      )
      .select('id')
      .single();

    if (itemError || !plaidItem) {
      throw new Error(itemError?.message ?? 'Unable to save manual card wallet.');
    }

    const accountName = `${typedProduct.issuer} ${typedProduct.name}`;
    const { data: account, error: accountError } = await supabase
      .from('plaid_accounts')
      .upsert(
        {
          user_id: user.id,
          plaid_item_id: plaidItem.id,
          account_id: manualAccountId(cardProductId, last4),
          name: accountName,
          official_name: body.label?.trim() || accountName,
          mask: last4,
          type: 'credit',
          subtype: 'credit card',
          current_balance: null,
          available_balance: null,
          credit_limit: null,
          iso_currency_code: 'USD',
        },
        { onConflict: 'user_id,account_id' },
      )
      .select('*')
      .single();

    if (accountError || !account) {
      throw new Error(accountError?.message ?? 'Unable to save manual card account.');
    }

    const { data: match, error: matchError } = await supabase
      .from('account_card_matches')
      .upsert(
        {
          user_id: user.id,
          plaid_account_id: account.id,
          card_product_id: cardProductId,
          match_status: 'manual',
          match_confidence: 1,
        },
        { onConflict: 'user_id,plaid_account_id' },
      )
      .select('id,card_product_id,match_status,match_confidence')
      .single();

    if (matchError || !match) {
      throw new Error(matchError?.message ?? 'Unable to save manual card match.');
    }

    return NextResponse.json({
      account,
      match,
      product: typedProduct,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save manual card.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

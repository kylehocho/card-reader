import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

type CardMatchRequest = {
  plaidAccountId?: string;
  cardProductId?: string;
  matchStatus?: string;
  matchConfidence?: number;
};

type CardProductRow = Pick<Database['public']['Tables']['card_products']['Row'], 'id' | 'issuer' | 'name'>;

function normalizeMatchStatus(value: unknown) {
  return value === 'suggested' ? 'suggested' : 'manual';
}

function normalizeConfidence(value: unknown) {
  const confidence = typeof value === 'number' && Number.isFinite(value) ? value : 1;
  return Math.max(0, Math.min(1, confidence));
}

export async function POST(request: Request) {
  try {
    const { user, response: authResponse } = await getAuthenticatedUser(request);
    if (authResponse) return authResponse;

    const body = (await request.json().catch(() => ({}))) as CardMatchRequest;
    const plaidAccountId = body.plaidAccountId?.trim();
    const cardProductId = body.cardProductId?.trim();

    if (!plaidAccountId) {
      return NextResponse.json({ error: 'plaidAccountId is required.' }, { status: 400 });
    }

    if (!cardProductId) {
      return NextResponse.json({ error: 'cardProductId is required.' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { data: account, error: accountError } = await supabase
      .from('plaid_accounts')
      .select('id,account_id,type,subtype')
      .eq('id', plaidAccountId)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Connected account was not found.' }, { status: 404 });
    }

    if (account.type !== 'credit' || account.subtype !== 'credit card') {
      return NextResponse.json({ error: 'Only credit card accounts can be matched to card products.' }, { status: 422 });
    }

    const { data: product, error: productError } = await supabase
      .from('card_products')
      .select('id,issuer,name')
      .eq('id', cardProductId)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'Card product was not found.' }, { status: 404 });
    }

    const typedProduct = product as CardProductRow;
    const matchStatus = normalizeMatchStatus(body.matchStatus);
    const matchConfidence = normalizeConfidence(body.matchConfidence);
    const { data: match, error: matchError } = await supabase
      .from('account_card_matches')
      .upsert(
        {
          user_id: user.id,
          plaid_account_id: account.id,
          card_product_id: typedProduct.id,
          match_status: matchStatus,
          match_confidence: matchConfidence,
        },
        { onConflict: 'user_id,plaid_account_id' },
      )
      .select('id,card_product_id,match_status,match_confidence')
      .single();

    if (matchError || !match) {
      throw new Error(matchError?.message ?? 'Unable to save card match.');
    }

    return NextResponse.json({
      account: {
        id: account.id,
        account_id: account.account_id,
      },
      match,
      product: typedProduct,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save card match.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

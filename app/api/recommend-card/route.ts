import { NextResponse } from 'next/server';
import { recommendCardForMerchant, type MerchantContext } from '@/lib/recommendation/merchant-context';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

type MatchRow = {
  card_product_id: string | null;
};

function bearerToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  return authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
}

async function authenticatedCardProductIds(request: Request) {
  const token = bearerToken(request);
  if (!token) return { cardProductIds: null, response: null };

  const supabase = getSupabaseAdminClient();
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return {
      cardProductIds: null,
      response: NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 }),
    };
  }

  const { data, error } = await supabase.from('account_card_matches').select('card_product_id').eq('user_id', userData.user.id);
  if (error) throw new Error(error.message);

  const cardProductIds = Array.from(new Set(((data ?? []) as MatchRow[]).map((match) => match.card_product_id).filter((id): id is string => Boolean(id))));
  if (cardProductIds.length === 0) {
    return {
      cardProductIds,
      response: NextResponse.json({ error: 'No matched card products are available for this user.' }, { status: 422 }),
    };
  }

  return { cardProductIds, response: null };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as MerchantContext;
    const authScope = await authenticatedCardProductIds(request);
    if (authScope.response) return authScope.response;

    const recommendation = recommendCardForMerchant({
      ...body,
      cardProductIds: authScope.cardProductIds ?? body.cardProductIds,
    });

    return NextResponse.json(recommendation);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to recommend a card.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

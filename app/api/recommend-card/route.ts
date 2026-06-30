import { NextResponse } from 'next/server';
import { recommendCardForMerchant, type MerchantContext } from '@/lib/recommendation/merchant-context';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import type { Database, Json } from '@/lib/supabase/types';

type MatchRow = {
  card_product_id: string | null;
};

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdminClient>;

function bearerToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  return authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
}

async function authenticatedCardProductIds(request: Request) {
  const token = bearerToken(request);
  if (!token) return { cardProductIds: null, response: null, supabase: null, userId: null };

  const supabase = getSupabaseAdminClient();
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return {
      cardProductIds: null,
      response: NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 }),
      supabase,
      userId: null,
    };
  }

  const { data, error } = await supabase.from('account_card_matches').select('card_product_id').eq('user_id', userData.user.id);
  if (error) throw new Error(error.message);

  const cardProductIds = Array.from(new Set(((data ?? []) as MatchRow[]).map((match) => match.card_product_id).filter((id): id is string => Boolean(id))));
  if (cardProductIds.length === 0) {
    return {
      cardProductIds,
      response: NextResponse.json({ error: 'No matched card products are available for this user.' }, { status: 422 }),
      supabase,
      userId: userData.user.id,
    };
  }

  return { cardProductIds, response: null, supabase, userId: userData.user.id };
}

function loggingClient(existingClient: SupabaseAdminClient | null) {
  if (existingClient) return existingClient;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return getSupabaseAdminClient();
}

function requestSnapshot(context: MerchantContext): Json {
  return {
    merchant: context.merchant ?? null,
    host: context.host ?? null,
    url: context.url ?? null,
    title: context.title ?? null,
    categoryHint: context.categoryHint ?? null,
    requestedCardProductCount: context.cardProductIds?.length ?? null,
  };
}

function recommendationSnapshot(recommendation: ReturnType<typeof recommendCardForMerchant>): Json {
  return {
    merchant: recommendation.merchant,
    category: recommendation.category,
    bestCard: recommendation.bestCard,
    runnerUp: recommendation.runnerUp ?? null,
    matchedOffer: recommendation.matchedOffer,
    reason: recommendation.reason,
  };
}

async function logRecommendationEvent(params: {
  supabase: SupabaseAdminClient | null;
  userId: string | null;
  mode: Database['public']['Tables']['recommendation_events']['Insert']['mode'];
  context: MerchantContext;
  candidateCardCount: number;
  recommendation: ReturnType<typeof recommendCardForMerchant>;
}) {
  const supabase = loggingClient(params.supabase);
  if (!supabase) return;

  const { error } = await supabase.from('recommendation_events').insert({
    user_id: params.userId,
    mode: params.mode,
    merchant: params.recommendation.merchant,
    host: params.context.host ?? null,
    url: params.context.url ?? null,
    title: params.context.title ?? null,
    category: params.recommendation.category,
    best_card_product_id: params.recommendation.bestCard.id,
    runner_up_card_product_id: params.recommendation.runnerUp?.id ?? null,
    matched_offer_title: params.recommendation.matchedOffer?.title ?? null,
    candidate_card_count: params.candidateCardCount,
    request_context: requestSnapshot(params.context),
    response_snapshot: recommendationSnapshot(params.recommendation),
  });

  if (error) {
    console.error('Unable to log recommendation event', error);
  }
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
    const candidateCardCount = (authScope.cardProductIds ?? body.cardProductIds)?.length ?? 10;

    await logRecommendationEvent({
      supabase: authScope.supabase,
      userId: authScope.userId,
      mode: authScope.userId ? 'signed_in' : 'demo',
      context: body,
      candidateCardCount,
      recommendation,
    });

    return NextResponse.json(recommendation);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to recommend a card.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

type RecommendationEventRow = Database['public']['Tables']['recommendation_events']['Row'];

function eventFromRow(row: RecommendationEventRow) {
  return {
    id: row.id,
    mode: row.mode,
    merchant: row.merchant,
    host: row.host,
    category: row.category,
    bestCardProductId: row.best_card_product_id,
    runnerUpCardProductId: row.runner_up_card_product_id,
    matchedOfferTitle: row.matched_offer_title,
    candidateCardCount: row.candidate_card_count,
    requestContext: row.request_context,
    responseSnapshot: row.response_snapshot,
    createdAt: row.created_at,
  };
}

function isMissingRecommendationEventsTable(error: { code?: string; message?: string } | null) {
  return error?.code === '42P01' || Boolean(error?.message?.includes('recommendation_events'));
}

export async function GET(request: Request) {
  try {
    const { user, response: authResponse } = await getAuthenticatedUser(request);
    if (authResponse) return authResponse;

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('recommendation_events')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (isMissingRecommendationEventsTable(error)) {
      return NextResponse.json({
        events: [],
        meta: {
          userId: user.id,
          count: 0,
          loggingAvailable: false,
          generatedAt: new Date().toISOString(),
        },
      });
    }

    if (error) throw new Error(error.message);

    const events = (data ?? []).map(eventFromRow);
    return NextResponse.json({
      events,
      meta: {
        userId: user.id,
        count: events.length,
        loggingAvailable: true,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load recommendation events.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

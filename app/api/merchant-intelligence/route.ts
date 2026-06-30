import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

type CountResult = {
  count: number | null;
  error: { code?: string; message?: string } | null;
};

function isMissingTable(error: { code?: string; message?: string } | null) {
  return error?.code === '42P01' || Boolean(error?.message?.includes('does not exist'));
}

async function countTable(supabase: ReturnType<typeof getSupabaseAdminClient>, table: 'merchant_catalog' | 'merchant_offer_rules' | 'card_reward_rules') {
  const { count, error } = (await supabase.from(table).select('id', { count: 'exact', head: true })) as CountResult;
  if (isMissingTable(error)) return { available: false, count: 0 };
  if (error) throw new Error(error.message);
  return { available: true, count: count ?? 0 };
}

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();
    const [merchants, offers, rewardRules] = await Promise.all([
      countTable(supabase, 'merchant_catalog'),
      countTable(supabase, 'merchant_offer_rules'),
      countTable(supabase, 'card_reward_rules'),
    ]);

    const available = merchants.available && offers.available && rewardRules.available;
    return NextResponse.json({
      available,
      tables: {
        merchantCatalog: merchants,
        merchantOfferRules: offers,
        cardRewardRules: rewardRules,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load merchant intelligence status.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

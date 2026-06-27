import { NextResponse } from 'next/server';
import { recommendCardForMerchant, type MerchantContext } from '@/lib/recommendation/merchant-context';

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as MerchantContext;
    const recommendation = recommendCardForMerchant(body);

    return NextResponse.json(recommendation);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to recommend a card.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

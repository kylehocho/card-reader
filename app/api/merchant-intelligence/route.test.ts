import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const mocks = vi.hoisted(() => ({
  getSupabaseAdminClient: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseAdminClient: mocks.getSupabaseAdminClient,
}));

type CountResult = {
  count: number | null;
  error: { code?: string; message: string } | null;
};

function countQuery(result: CountResult) {
  return {
    select: vi.fn(async () => result),
  };
}

function supabaseWithCounts(results: Record<string, CountResult>) {
  return {
    from: vi.fn((table: string) => countQuery(results[table] ?? { count: null, error: { message: `Unexpected table ${table}` } })),
  };
}

describe('GET /api/merchant-intelligence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns table availability and counts', async () => {
    mocks.getSupabaseAdminClient.mockReturnValue(
      supabaseWithCounts({
        merchant_catalog: { count: 14, error: null },
        merchant_offer_rules: { count: 4, error: null },
        card_reward_rules: { count: 50, error: null },
      }),
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      available: true,
      tables: {
        merchantCatalog: { available: true, count: 14 },
        merchantOfferRules: { available: true, count: 4 },
        cardRewardRules: { available: true, count: 50 },
      },
    });
  });

  it('returns unavailable counts when the migration is missing', async () => {
    mocks.getSupabaseAdminClient.mockReturnValue(
      supabaseWithCounts({
        merchant_catalog: { count: null, error: { code: '42P01', message: 'relation "merchant_catalog" does not exist' } },
        merchant_offer_rules: { count: null, error: { code: '42P01', message: 'relation "merchant_offer_rules" does not exist' } },
        card_reward_rules: { count: null, error: { code: '42P01', message: 'relation "card_reward_rules" does not exist' } },
      }),
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      available: false,
      tables: {
        merchantCatalog: { available: false, count: 0 },
        merchantOfferRules: { available: false, count: 0 },
        cardRewardRules: { available: false, count: 0 },
      },
    });
  });

  it('returns a controlled 500 when a count query fails', async () => {
    mocks.getSupabaseAdminClient.mockReturnValue(
      supabaseWithCounts({
        merchant_catalog: { count: null, error: { message: 'catalog unavailable' } },
      }),
    );

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'catalog unavailable' });
  });
});

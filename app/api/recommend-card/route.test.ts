import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from './route';

const mocks = vi.hoisted(() => ({
  getSupabaseAdminClient: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseAdminClient: mocks.getSupabaseAdminClient,
}));

type QueryResult = {
  data: unknown[] | null;
  error: { message: string } | null;
};

function request(body: unknown, token?: string) {
  return new Request('https://example.com/api/recommend-card', {
    method: 'POST',
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
    body: JSON.stringify(body),
  });
}

function queryResult(result: QueryResult) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    then: (resolve: (value: QueryResult) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject),
  };

  return query;
}

function supabaseForAuth(options: {
  user?: { id: string } | null;
  userError?: { message: string } | null;
  matches?: unknown[];
  matchError?: { message: string } | null;
  recommendationEventError?: { message: string } | null;
}) {
  const recommendationEventsInsert = vi.fn(async () => ({
    data: null,
    error: options.recommendationEventError ?? null,
  }));

  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: options.user ?? null },
        error: options.userError ?? null,
      })),
    },
    from: vi.fn((table: string) => {
      if (table === 'recommendation_events') return { insert: recommendationEventsInsert };
      if (table !== 'account_card_matches') throw new Error(`Unexpected table ${table}`);
      return queryResult({
        data: options.matches ?? [],
        error: options.matchError ?? null,
      });
    }),
    recommendationEventsInsert,
  };
}

describe('POST /api/recommend-card', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps anonymous recommendations on the demo catalog without requiring Supabase', async () => {
    const response = await POST(
      request({
        merchant: 'Patagonia',
        url: 'https://www.patagonia.com/shop/mens',
        categoryHint: 'shopping',
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      merchant: 'Patagonia',
      bestCard: { id: 'capital-one-venture-x' },
    });
    expect(mocks.getSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it('rejects an invalid bearer token instead of silently falling back to demo cards', async () => {
    mocks.getSupabaseAdminClient.mockReturnValue(
      supabaseForAuth({
        user: null,
        userError: { message: 'bad jwt' },
      }),
    );

    const response = await POST(request({ merchant: 'Patagonia' }, 'invalid-token'));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid or expired session.' });
  });

  it('uses the authenticated user matched card products when a bearer token is present', async () => {
    const supabase = supabaseForAuth({
      user: { id: 'user-1' },
      matches: [{ card_product_id: 'amex-gold' }],
    });
    mocks.getSupabaseAdminClient.mockReturnValue(supabase);

    const response = await POST(
      request(
        {
          url: 'https://www.ubereats.com/store/example',
          cardProductIds: ['capital-one-venture-x'],
        },
        'valid-token',
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      merchant: 'Uber Eats',
      category: 'dining',
      bestCard: { id: 'amex-gold' },
      matchedOffer: {
        title: 'Amex Uber Cash may apply to Uber Eats after enrollment.',
      },
    });
    expect(supabase.recommendationEventsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        mode: 'signed_in',
        merchant: 'Uber Eats',
        category: 'dining',
        best_card_product_id: 'amex-gold',
        candidate_card_count: 1,
      }),
    );
  });

  it('logs anonymous recommendations when server credentials are configured', async () => {
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

    const supabase = supabaseForAuth({});
    mocks.getSupabaseAdminClient.mockReturnValue(supabase);

    try {
      const response = await POST(
        request({
          merchant: 'Whole Foods',
          host: 'wholefoodsmarket.com',
          categoryHint: 'groceries',
          cardProductIds: ['amex-gold', 'capital-one-venture-x'],
        }),
      );

      expect(response.status).toBe(200);
      expect(supabase.recommendationEventsInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: null,
          mode: 'demo',
          merchant: 'Whole Foods',
          host: 'wholefoodsmarket.com',
          category: 'groceries',
          best_card_product_id: 'amex-gold',
          candidate_card_count: 2,
          request_context: expect.objectContaining({
            host: 'wholefoodsmarket.com',
            requestedCardProductCount: 2,
          }),
        }),
      );
    } finally {
      if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
      if (originalServiceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
    }
  });

  it('returns a controlled response when the authenticated user has no matched cards', async () => {
    mocks.getSupabaseAdminClient.mockReturnValue(
      supabaseForAuth({
        user: { id: 'user-1' },
        matches: [],
      }),
    );

    const response = await POST(request({ merchant: 'Patagonia' }, 'valid-token'));

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({ error: 'No matched card products are available for this user.' });
  });

  it('returns a controlled 500 when matched-card lookup fails', async () => {
    mocks.getSupabaseAdminClient.mockReturnValue(
      supabaseForAuth({
        user: { id: 'user-1' },
        matchError: { message: 'matches unavailable' },
      }),
    );

    const response = await POST(request({ merchant: 'Patagonia' }, 'valid-token'));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'matches unavailable' });
  });
});

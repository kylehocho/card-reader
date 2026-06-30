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
}) {
  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: options.user ?? null },
        error: options.userError ?? null,
      })),
    },
    from: vi.fn((table: string) => {
      if (table !== 'account_card_matches') throw new Error(`Unexpected table ${table}`);
      return queryResult({
        data: options.matches ?? [],
        error: options.matchError ?? null,
      });
    }),
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
    mocks.getSupabaseAdminClient.mockReturnValue(
      supabaseForAuth({
        user: { id: 'user-1' },
        matches: [{ card_product_id: 'amex-gold' }],
      }),
    );

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

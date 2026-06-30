import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  getSupabaseAdminClient: vi.fn(),
}));

vi.mock('@/lib/supabase/auth', () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}));

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseAdminClient: mocks.getSupabaseAdminClient,
}));

type QueryResult = {
  data: unknown[] | null;
  error: { code?: string; message: string } | null;
};

function queryResult(result: QueryResult) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    then: (resolve: (value: QueryResult) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject),
  };

  return query;
}

function supabaseWithResult(result: QueryResult) {
  return {
    from: vi.fn((table: string) => {
      if (table !== 'recommendation_events') throw new Error(`Unexpected table ${table}`);
      return queryResult(result);
    }),
  };
}

const request = new Request('https://example.com/api/recommendation-events', {
  headers: { authorization: 'Bearer test-token' },
});

describe('GET /api/recommendation-events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the auth response when the request is unauthenticated', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({
      user: null,
      response: Response.json({ error: 'Authentication is required.' }, { status: 401 }),
    });

    const response = await GET(new Request('https://example.com/api/recommendation-events'));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Authentication is required.' });
    expect(mocks.getSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it('returns recent recommendation events for the authenticated user', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({
      user: { id: 'user-1' },
      response: null,
    });
    mocks.getSupabaseAdminClient.mockReturnValue(
      supabaseWithResult({
        data: [
          {
            id: 'event-1',
            user_id: 'user-1',
            mode: 'signed_in',
            merchant: 'Whole Foods',
            host: 'wholefoodsmarket.com',
            url: 'https://www.wholefoodsmarket.com',
            title: 'Whole Foods',
            category: 'groceries',
            best_card_product_id: 'amex-gold',
            runner_up_card_product_id: 'chase-sapphire-preferred',
            matched_offer_title: null,
            candidate_card_count: 2,
            request_context: { host: 'wholefoodsmarket.com' },
            response_snapshot: { bestCard: { id: 'amex-gold' } },
            created_at: '2026-06-30T19:00:00.000Z',
          },
        ],
        error: null,
      }),
    );

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.meta).toMatchObject({
      userId: 'user-1',
      count: 1,
      loggingAvailable: true,
    });
    expect(body.events).toEqual([
      expect.objectContaining({
        id: 'event-1',
        mode: 'signed_in',
        merchant: 'Whole Foods',
        category: 'groceries',
        bestCardProductId: 'amex-gold',
        candidateCardCount: 2,
      }),
    ]);
  });

  it('returns an unavailable meta response when the migration has not been applied yet', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({
      user: { id: 'user-1' },
      response: null,
    });
    mocks.getSupabaseAdminClient.mockReturnValue(
      supabaseWithResult({
        data: null,
        error: { code: '42P01', message: 'relation "public.recommendation_events" does not exist' },
      }),
    );

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      events: [],
      meta: {
        userId: 'user-1',
        count: 0,
        loggingAvailable: false,
      },
    });
  });

  it('returns a controlled 500 when the event query fails', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({
      user: { id: 'user-1' },
      response: null,
    });
    mocks.getSupabaseAdminClient.mockReturnValue(
      supabaseWithResult({
        data: null,
        error: { message: 'event lookup failed' },
      }),
    );

    const response = await GET(request);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'event lookup failed' });
  });
});

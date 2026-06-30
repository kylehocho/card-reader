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
  error: { message: string } | null;
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

function supabaseWithResults(resultsByTable: Record<string, QueryResult>) {
  return {
    from: vi.fn((table: string) => {
      const result = resultsByTable[table];
      if (!result) throw new Error(`Missing mock result for ${table}`);
      return queryResult(result);
    }),
  };
}

const request = new Request('https://example.com/api/wallet/analysis', {
  headers: { authorization: 'Bearer test-token' },
});

const productRow = {
  id: 'amex-gold',
  issuer: 'American Express',
  name: 'Gold Card',
  annual_fee: 325,
  reward_currency: 'Membership Rewards',
  rewards: { dining: 4, general: 1 },
  benefits: [
    {
      id: 'dining-credit',
      type: 'statement_credit',
      title: '$10 dining credit',
      value: 10,
      cadence: 'monthly',
      eligible_categories: ['dining'],
    },
  ],
};

describe('GET /api/wallet/analysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the auth response when the request is unauthenticated', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({
      user: null,
      response: Response.json({ error: 'Authentication is required.' }, { status: 401 }),
    });

    const response = await GET(new Request('https://example.com/api/wallet/analysis'));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Authentication is required.' });
    expect(mocks.getSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it('returns wallet analysis and meta counts for an authenticated user', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({
      user: { id: 'user-1' },
      response: null,
    });
    mocks.getSupabaseAdminClient.mockReturnValue(
      supabaseWithResults({
        card_products: { data: [productRow], error: null },
        plaid_accounts: {
          data: [
            {
              id: 'plaid-account-1',
              account_id: 'external-account-1',
              name: 'Gold',
              official_name: 'American Express Gold',
            },
          ],
          error: null,
        },
        account_card_matches: {
          data: [
            {
              plaid_account_id: 'plaid-account-1',
              card_product_id: 'amex-gold',
            },
          ],
          error: null,
        },
        plaid_transactions: {
          data: [
            {
              id: 'tx-1',
              plaid_account_id: 'plaid-account-1',
              account_id: 'external-account-1',
              merchant_name: 'Resy',
              name: 'Resy dining',
              amount: 6,
              date: '2026-06-29',
              category: ['Food and Drink', 'Restaurants'],
              personal_finance_category: null,
              pending: false,
            },
          ],
          error: null,
        },
      }),
    );

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.meta).toMatchObject({
      userId: 'user-1',
      cardProducts: 1,
      linkedAccounts: 1,
      matchedAccounts: 1,
      transactions: 1,
    });
    expect(body.meta.generatedAt).toEqual(expect.any(String));
    expect(body.analysis.trackers).toEqual([
      expect.objectContaining({
        cardProductId: 'amex-gold',
        used: 6,
        target: 10,
        status: 'in-progress',
      }),
    ]);
    expect(body.analysis).toEqual(
      expect.objectContaining({
        welcomeBonuses: [],
        recommendations: [],
        alerts: [],
      }),
    );
  });

  it('returns a controlled 500 when a Supabase query fails', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({
      user: { id: 'user-1' },
      response: null,
    });
    mocks.getSupabaseAdminClient.mockReturnValue(
      supabaseWithResults({
        card_products: { data: null, error: { message: 'card catalog unavailable' } },
        plaid_accounts: { data: [], error: null },
        account_card_matches: { data: [], error: null },
        plaid_transactions: { data: [], error: null },
      }),
    );

    const response = await GET(request);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'card catalog unavailable' });
  });
});

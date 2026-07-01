import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

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
  data: unknown;
  error: { message: string } | null;
};

function request(body: unknown) {
  return new Request('https://example.com/api/wallet/manual-cards', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function queryResult(result: QueryResult) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    single: vi.fn(async () => result),
  };

  return query;
}

function upsertResult(result: QueryResult, calls: unknown[]) {
  return {
    upsert: vi.fn((payload: unknown, options: unknown) => {
      calls.push({ payload, options });
      return queryResult(result);
    }),
  };
}

function supabaseWithResults(results: {
  product: QueryResult;
  item: QueryResult;
  account: QueryResult;
  match: QueryResult;
  upsertCalls?: unknown[];
}) {
  const upsertCalls = results.upsertCalls ?? [];

  return {
    from: vi.fn((table: string) => {
      if (table === 'card_products') return queryResult(results.product);
      if (table === 'plaid_items') return upsertResult(results.item, upsertCalls);
      if (table === 'plaid_accounts') return upsertResult(results.account, upsertCalls);
      if (table === 'account_card_matches') return upsertResult(results.match, upsertCalls);
      throw new Error(`Unexpected table ${table}`);
    }),
    upsertCalls,
  };
}

describe('POST /api/wallet/manual-cards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the auth response when unauthenticated', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({
      user: null,
      response: Response.json({ error: 'Authentication is required.' }, { status: 401 }),
    });

    const response = await POST(request({ cardProductId: 'amex-gold', last4: '9999' }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Authentication is required.' });
    expect(mocks.getSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it('validates the card product and last four digits before writing', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({
      user: { id: 'user-1' },
      response: null,
    });

    const missingProductResponse = await POST(request({ last4: '9999' }));
    const badLast4Response = await POST(request({ cardProductId: 'amex-gold', last4: '99' }));

    expect(missingProductResponse.status).toBe(400);
    await expect(missingProductResponse.json()).resolves.toEqual({ error: 'cardProductId is required.' });
    expect(badLast4Response.status).toBe(400);
    await expect(badLast4Response.json()).resolves.toEqual({ error: 'last4 must contain exactly four digits.' });
    expect(mocks.getSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it('creates a manual item, account, and product match for the authenticated user', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({
      user: { id: 'user-1' },
      response: null,
    });

    const supabase = supabaseWithResults({
      product: {
        data: { id: 'amex-gold', issuer: 'American Express', name: 'Gold Card' },
        error: null,
      },
      item: { data: { id: 'manual-item-1' }, error: null },
      account: {
        data: {
          id: 'manual-account-1',
          user_id: 'user-1',
          account_id: 'manual:amex-gold:9999',
          name: 'American Express Gold Card',
          mask: '9999',
          type: 'credit',
          subtype: 'credit card',
        },
        error: null,
      },
      match: {
        data: {
          id: 'match-1',
          card_product_id: 'amex-gold',
          match_status: 'manual',
          match_confidence: 1,
        },
        error: null,
      },
    });
    mocks.getSupabaseAdminClient.mockReturnValue(supabase);

    const response = await POST(request({ cardProductId: 'amex-gold', last4: '9999', label: 'Gold personal' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      account: { id: 'manual-account-1', account_id: 'manual:amex-gold:9999' },
      match: { card_product_id: 'amex-gold', match_status: 'manual' },
      product: { id: 'amex-gold' },
    });
    expect(supabase.upsertCalls).toEqual([
      expect.objectContaining({
        payload: expect.objectContaining({
          item_id: 'manual-wallet:user-1',
          status: 'manual',
        }),
      }),
      expect.objectContaining({
        payload: expect.objectContaining({
          plaid_item_id: 'manual-item-1',
          account_id: 'manual:amex-gold:9999',
          official_name: 'Gold personal',
        }),
      }),
      expect.objectContaining({
        payload: expect.objectContaining({
          plaid_account_id: 'manual-account-1',
          card_product_id: 'amex-gold',
          match_status: 'manual',
        }),
      }),
    ]);
  });
});

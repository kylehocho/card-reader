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
  return new Request('https://example.com/api/wallet/card-matches', {
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
  account: QueryResult;
  product: QueryResult;
  match: QueryResult;
  upsertCalls?: unknown[];
}) {
  const upsertCalls = results.upsertCalls ?? [];

  return {
    from: vi.fn((table: string) => {
      if (table === 'plaid_accounts') return queryResult(results.account);
      if (table === 'card_products') return queryResult(results.product);
      if (table === 'account_card_matches') return upsertResult(results.match, upsertCalls);
      throw new Error(`Unexpected table ${table}`);
    }),
    upsertCalls,
  };
}

describe('POST /api/wallet/card-matches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the auth response when unauthenticated', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({
      user: null,
      response: Response.json({ error: 'Authentication is required.' }, { status: 401 }),
    });

    const response = await POST(request({ plaidAccountId: 'account-1', cardProductId: 'amex-gold' }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Authentication is required.' });
    expect(mocks.getSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it('validates required account and card product ids before writing', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({
      user: { id: 'user-1' },
      response: null,
    });

    const missingAccountResponse = await POST(request({ cardProductId: 'amex-gold' }));
    const missingProductResponse = await POST(request({ plaidAccountId: 'account-1' }));

    expect(missingAccountResponse.status).toBe(400);
    await expect(missingAccountResponse.json()).resolves.toEqual({ error: 'plaidAccountId is required.' });
    expect(missingProductResponse.status).toBe(400);
    await expect(missingProductResponse.json()).resolves.toEqual({ error: 'cardProductId is required.' });
    expect(mocks.getSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it('rejects accounts that do not belong to the authenticated user', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({
      user: { id: 'user-1' },
      response: null,
    });
    const supabase = supabaseWithResults({
      account: { data: null, error: { message: 'Not found' } },
      product: { data: null, error: null },
      match: { data: null, error: null },
    });
    mocks.getSupabaseAdminClient.mockReturnValue(supabase);

    const response = await POST(request({ plaidAccountId: 'other-user-account', cardProductId: 'amex-gold' }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Connected account was not found.' });
    expect(supabase.upsertCalls).toEqual([]);
  });

  it('only allows credit card accounts to be matched', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({
      user: { id: 'user-1' },
      response: null,
    });
    const supabase = supabaseWithResults({
      account: {
        data: { id: 'account-1', account_id: 'checking-1', type: 'depository', subtype: 'checking' },
        error: null,
      },
      product: { data: null, error: null },
      match: { data: null, error: null },
    });
    mocks.getSupabaseAdminClient.mockReturnValue(supabase);

    const response = await POST(request({ plaidAccountId: 'account-1', cardProductId: 'amex-gold' }));

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({ error: 'Only credit card accounts can be matched to card products.' });
    expect(supabase.upsertCalls).toEqual([]);
  });

  it('rejects unknown card products', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({
      user: { id: 'user-1' },
      response: null,
    });
    const supabase = supabaseWithResults({
      account: {
        data: { id: 'account-1', account_id: 'credit-1', type: 'credit', subtype: 'credit card' },
        error: null,
      },
      product: { data: null, error: { message: 'Not found' } },
      match: { data: null, error: null },
    });
    mocks.getSupabaseAdminClient.mockReturnValue(supabase);

    const response = await POST(request({ plaidAccountId: 'account-1', cardProductId: 'unknown-card' }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Card product was not found.' });
    expect(supabase.upsertCalls).toEqual([]);
  });

  it('upserts a suggested match for the authenticated user account', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({
      user: { id: 'user-1' },
      response: null,
    });
    const supabase = supabaseWithResults({
      account: {
        data: { id: 'account-1', account_id: 'credit-1', type: 'credit', subtype: 'credit card' },
        error: null,
      },
      product: {
        data: { id: 'amex-gold', issuer: 'American Express', name: 'Gold Card' },
        error: null,
      },
      match: {
        data: {
          id: 'match-1',
          card_product_id: 'amex-gold',
          match_status: 'suggested',
          match_confidence: 0.76,
        },
        error: null,
      },
    });
    mocks.getSupabaseAdminClient.mockReturnValue(supabase);

    const response = await POST(
      request({
        plaidAccountId: 'account-1',
        cardProductId: 'amex-gold',
        matchStatus: 'suggested',
        matchConfidence: 0.76,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      account: { id: 'account-1', account_id: 'credit-1' },
      match: { card_product_id: 'amex-gold', match_status: 'suggested', match_confidence: 0.76 },
      product: { id: 'amex-gold' },
    });
    expect(supabase.upsertCalls).toEqual([
      expect.objectContaining({
        payload: expect.objectContaining({
          user_id: 'user-1',
          plaid_account_id: 'account-1',
          card_product_id: 'amex-gold',
          match_status: 'suggested',
          match_confidence: 0.76,
        }),
        options: { onConflict: 'user_id,plaid_account_id' },
      }),
    ]);
  });

  it('defaults unknown match statuses to manual and clamps confidence', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({
      user: { id: 'user-1' },
      response: null,
    });
    const supabase = supabaseWithResults({
      account: {
        data: { id: 'account-1', account_id: 'credit-1', type: 'credit', subtype: 'credit card' },
        error: null,
      },
      product: {
        data: { id: 'amex-gold', issuer: 'American Express', name: 'Gold Card' },
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

    const response = await POST(
      request({
        plaidAccountId: 'account-1',
        cardProductId: 'amex-gold',
        matchStatus: 'seeded_sandbox',
        matchConfidence: 12,
      }),
    );

    expect(response.status).toBe(200);
    expect(supabase.upsertCalls).toEqual([
      expect.objectContaining({
        payload: expect.objectContaining({
          match_status: 'manual',
          match_confidence: 1,
        }),
      }),
    ]);
  });
});

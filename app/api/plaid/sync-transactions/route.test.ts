import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  getSupabaseAdminClient: vi.fn(),
  getPlaidClient: vi.fn(),
  decryptSecret: vi.fn(),
}));

vi.mock('@/lib/supabase/auth', () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}));

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseAdminClient: mocks.getSupabaseAdminClient,
}));

vi.mock('@/lib/plaid', () => ({
  getPlaidClient: mocks.getPlaidClient,
}));

vi.mock('@/lib/encryption', () => ({
  decryptSecret: mocks.decryptSecret,
}));

type QueryResponse<T> = {
  data: T;
  error: { message: string } | null;
};

function request(body: unknown = {}) {
  return new Request('https://example.com/api/plaid/sync-transactions', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function query<T>(response: QueryResponse<T>) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    upsert: vi.fn(() => chain),
    then: (resolve: (value: QueryResponse<T>) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(response).then(resolve, reject),
  };

  return chain;
}

describe('POST /api/plaid/sync-transactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedUser.mockResolvedValue({
      user: { id: 'user-1' },
      response: null,
    });
  });

  it('returns the auth response when unauthenticated', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({
      user: null,
      response: Response.json({ error: 'Authentication is required.' }, { status: 401 }),
    });

    const response = await POST(request());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Authentication is required.' });
    expect(mocks.getSupabaseAdminClient).not.toHaveBeenCalled();
    expect(mocks.getPlaidClient).not.toHaveBeenCalled();
  });

  it('skips Plaid client initialization when the user has no active Plaid items', async () => {
    const itemQuery = query({ data: [], error: null });
    const supabase = {
      from: vi.fn((table: string) => {
        if (table !== 'plaid_items') throw new Error(`Unexpected table ${table}`);
        return itemQuery;
      }),
    };
    mocks.getSupabaseAdminClient.mockReturnValue(supabase);

    const response = await POST(request({ plaidItemId: 'manual-item-1' }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ itemCount: 0, totalSaved: 0, items: [] });
    expect(itemQuery.eq).toHaveBeenCalledWith('status', 'active');
    expect(itemQuery.eq).toHaveBeenCalledWith('id', 'manual-item-1');
    expect(mocks.getPlaidClient).not.toHaveBeenCalled();
    expect(mocks.decryptSecret).not.toHaveBeenCalled();
  });

  it('syncs transactions for active Plaid credit-card accounts', async () => {
    const itemQuery = query({
      data: [{ id: 'item-1', user_id: 'user-1', access_token_encrypted: 'encrypted-token', status: 'active' }],
      error: null,
    });
    const accountQuery = query({
      data: [{ id: 'account-db-1', account_id: 'plaid-account-1' }],
      error: null,
    });
    const transactionUpsert = query({
      data: [{ id: 'txn-db-1' }],
      error: null,
    });
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'plaid_items') return itemQuery;
        if (table === 'plaid_accounts') return accountQuery;
        if (table === 'plaid_transactions') return transactionUpsert;
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    const transactionsGet = vi.fn(async () => ({
      data: {
        total_transactions: 2,
        transactions: [
          {
            account_id: 'plaid-account-1',
            transaction_id: 'txn-1',
            name: 'Whole Foods',
            merchant_name: 'Whole Foods Market',
            amount: 42.19,
            iso_currency_code: 'USD',
            date: '2026-07-01',
            authorized_date: '2026-07-01',
            pending: false,
            payment_channel: 'in store',
            category: ['Shops', 'Supermarkets and Groceries'],
            category_id: '19046000',
            personal_finance_category: { primary: 'GENERAL_MERCHANDISE', detailed: 'GENERAL_MERCHANDISE_SUPERSTORES' },
          },
          {
            account_id: 'untracked-account',
            transaction_id: 'txn-2',
            name: 'Checking transfer',
            merchant_name: null,
            amount: 10,
            iso_currency_code: 'USD',
            date: '2026-07-01',
            authorized_date: null,
            pending: false,
            payment_channel: 'other',
            category: null,
            category_id: null,
            personal_finance_category: null,
          },
        ],
      },
    }));

    mocks.getSupabaseAdminClient.mockReturnValue(supabase);
    mocks.getPlaidClient.mockReturnValue({ transactionsGet });
    mocks.decryptSecret.mockReturnValue('access-token');

    const response = await POST(request({ days: 30 }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      itemCount: 1,
      totalSaved: 1,
      items: [{ plaidItemId: 'item-1', available: 2, saved: 1, skipped: 1 }],
    });
    expect(mocks.decryptSecret).toHaveBeenCalledWith('encrypted-token');
    expect(transactionsGet).toHaveBeenCalledWith(
      expect.objectContaining({
        access_token: 'access-token',
        options: { count: 500, offset: 0 },
      }),
    );
    expect(transactionUpsert.upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          user_id: 'user-1',
          plaid_item_id: 'item-1',
          plaid_account_id: 'account-db-1',
          account_id: 'plaid-account-1',
          transaction_id: 'txn-1',
          merchant_name: 'Whole Foods Market',
          category: ['Shops', 'Supermarkets and Groceries'],
        }),
      ],
      { onConflict: 'user_id,transaction_id' },
    );
  });
});

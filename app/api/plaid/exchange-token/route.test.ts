import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  getSupabaseAdminClient: vi.fn(),
  getPlaidClient: vi.fn(),
  encryptSecret: vi.fn((value: string) => `encrypted:${value}`),
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
  encryptSecret: mocks.encryptSecret,
}));

function request(body: unknown) {
  return new Request('https://example.com/api/plaid/exchange-token', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function account(overrides: Record<string, unknown>) {
  return {
    account_id: 'account-id',
    name: 'Account',
    official_name: null,
    mask: '1234',
    type: 'credit',
    subtype: 'credit card',
    balances: {
      current: 100,
      available: null,
      limit: 1000,
      iso_currency_code: 'USD',
    },
    ...overrides,
  };
}

function supabaseSuccess() {
  const upsert = vi.fn((rows: unknown) => ({
    select: vi.fn((selection?: string) => {
      if (selection === 'id') {
        return {
          single: vi.fn(async () => ({ data: { id: 'saved-item-id' }, error: null })),
        };
      }

      return Promise.resolve({ data: Array.isArray(rows) ? rows : [rows], error: null });
    }),
  }));

  return {
    from: vi.fn(() => ({ upsert })),
    upsert,
  };
}

describe('POST /api/plaid/exchange-token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedUser.mockResolvedValue({
      user: { id: 'user-1' },
      response: null,
    });
  });

  it('rejects requests without a public token', async () => {
    const response = await POST(request({}));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'publicToken is required.' });
    expect(mocks.getPlaidClient).not.toHaveBeenCalled();
  });

  it('does not persist an item when Plaid returns no credit card accounts', async () => {
    const itemRemove = vi.fn(async () => ({ data: {} }));
    mocks.getPlaidClient.mockReturnValue({
      itemPublicTokenExchange: vi.fn(async () => ({ data: { access_token: 'access-token', item_id: 'item-id' } })),
      accountsGet: vi.fn(async () => ({
        data: {
          item: { institution_id: 'ins_1' },
          accounts: [
            account({ account_id: 'checking-1', type: 'depository', subtype: 'checking' }),
            account({ account_id: 'savings-1', type: 'depository', subtype: 'savings' }),
          ],
        },
      })),
      liabilitiesGet: vi.fn(async () => ({ data: { liabilities: {} } })),
      itemRemove,
    });

    const response = await POST(request({ publicToken: 'public-token' }));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body).toMatchObject({
      importedAccounts: 0,
      skippedAccounts: 2,
    });
    expect(body.error).toContain('No credit card accounts were found');
    expect(itemRemove).toHaveBeenCalledWith({ access_token: 'access-token' });
    expect(mocks.getSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it('persists only credit card accounts from a mixed Plaid item', async () => {
    const creditCard = account({ account_id: 'credit-1', name: 'Credit Card' });
    const checking = account({ account_id: 'checking-1', name: 'Checking', type: 'depository', subtype: 'checking' });
    const plaid = {
      itemPublicTokenExchange: vi.fn(async () => ({ data: { access_token: 'access-token', item_id: 'item-id' } })),
      accountsGet: vi.fn(async () => ({
        data: {
          item: { institution_id: 'ins_1' },
          accounts: [creditCard, checking],
        },
      })),
      liabilitiesGet: vi.fn(async () => ({ data: { liabilities: { credit: [] } } })),
      itemRemove: vi.fn(),
    };
    const supabase = supabaseSuccess();

    mocks.getPlaidClient.mockReturnValue(plaid);
    mocks.getSupabaseAdminClient.mockReturnValue(supabase);

    const response = await POST(request({ publicToken: 'public-token', institutionName: 'Test Bank' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.accounts).toHaveLength(1);
    expect(body.accounts[0].account_id).toBe('credit-1');
    expect(body.importedAccounts).toBe(1);
    expect(body.skippedAccounts).toBe(1);
    expect(plaid.itemRemove).not.toHaveBeenCalled();

    const plaidAccountUpsert = supabase.upsert.mock.calls[1]?.[0];
    expect(plaidAccountUpsert).toEqual([
      expect.objectContaining({
        account_id: 'credit-1',
        type: 'credit',
        subtype: 'credit card',
      }),
    ]);
  });
});

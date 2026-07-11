import { describe, expect, it } from 'vitest';
import { derivePlaidAccountMatchSuggestions } from './usePlaidAccountMatching';
import type { PlaidConnectedAccount } from './types';
import type { Database } from '@/lib/supabase/types';

type CardProductRow = Database['public']['Tables']['card_products']['Row'];

const baseAccount: PlaidConnectedAccount = {
  accountId: 'account-1',
  institutionName: 'Chase',
  name: 'Credit Card',
  mask: '1234',
  type: 'credit',
  subtype: 'credit card',
  currentBalance: 100,
  limit: 1000,
};

const products = [
  {
    id: 'chase-sapphire-reserve',
    issuer: 'Chase',
    name: 'Chase Sapphire Reserve',
    network: 'Visa',
    annual_fee: 795,
    reward_currency: 'Ultimate Rewards',
    rewards: {},
    benefits: [],
    source_confidence: 'seed',
    last_verified_at: '2026-07-11',
    created_at: '2026-07-11',
    updated_at: '2026-07-11',
  },
  {
    id: 'capital-one-venture-x',
    issuer: 'Capital One',
    name: 'Capital One Venture X Rewards Credit Card',
    network: 'Visa',
    annual_fee: 395,
    reward_currency: 'Capital One Miles',
    rewards: {},
    benefits: [],
    source_confidence: 'seed',
    last_verified_at: '2026-07-11',
    created_at: '2026-07-11',
    updated_at: '2026-07-11',
  },
] satisfies CardProductRow[];

describe('derivePlaidAccountMatchSuggestions', () => {
  it('indexes suggestions by Plaid account id', () => {
    const suggestions = derivePlaidAccountMatchSuggestions(
      [
        { ...baseAccount, accountId: 'reserve-1', name: 'Sapphire Reserve Visa' },
        { ...baseAccount, accountId: 'venture-x-1', institutionName: 'Capital One', name: 'Venture X Rewards' },
      ],
      products,
    );

    expect(suggestions.get('reserve-1')?.product.id).toBe('chase-sapphire-reserve');
    expect(suggestions.get('venture-x-1')?.product.id).toBe('capital-one-venture-x');
  });

  it('keeps unmatched accounts in the map with a null suggestion', () => {
    const suggestions = derivePlaidAccountMatchSuggestions(
      [{ ...baseAccount, accountId: 'unknown-1', institutionName: 'Local Bank', name: 'Everyday Credit' }],
      products,
    );

    expect(suggestions.has('unknown-1')).toBe(true);
    expect(suggestions.get('unknown-1')).toBeNull();
  });
});

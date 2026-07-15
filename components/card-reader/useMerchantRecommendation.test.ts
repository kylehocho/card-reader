import { describe, expect, it } from 'vitest';

import {
  merchantApiRecommendationToResult,
  merchantResultsForQuery,
  type MerchantResult,
} from './useMerchantRecommendation';

const seedResults: MerchantResult[] = [
  {
    id: 'wholefoods-gold',
    merchant: 'Whole Foods',
    category: 'Groceries',
    card: 'Gold Card',
    rank: 1,
    reward: '4x U.S. supermarkets',
    value: '$7.20 est. value',
    reason: 'Best grocery multiplier.',
    matchedBenefits: ['4x groceries'],
    tags: ['whole foods', 'groceries'],
  },
  {
    id: 'wholefoods-citi',
    merchant: 'Whole Foods',
    category: 'Groceries',
    card: 'Citi Strata Premier',
    rank: 2,
    reward: '3x groceries',
    value: '$5.40 est. value',
    reason: 'Runner-up grocery option.',
    matchedBenefits: ['3x groceries'],
    tags: ['whole foods', 'groceries'],
  },
  {
    id: 'delta-platinum',
    merchant: 'Delta',
    category: 'Flights',
    card: 'Platinum Card',
    rank: 1,
    reward: '5x flights',
    value: '$42.50 est. value',
    reason: 'Best flight card.',
    matchedBenefits: ['5x airfare'],
    tags: ['delta', 'flights'],
  },
];

describe('merchant recommendation projection', () => {
  it('projects a live API recommendation into the Use Now result contract', () => {
    expect(
      merchantApiRecommendationToResult({
        merchant: 'Whole Foods',
        category: 'groceries',
        bestCard: {
          id: 'amex-gold',
          issuer: 'American Express',
          name: 'Gold Card',
          multiplier: 4,
          rewardCurrency: 'Membership Rewards',
        },
        runnerUp: {
          id: 'citi-strata-premier',
          issuer: 'Citi',
          name: 'Citi Strata Premier',
          multiplier: 3,
          rewardCurrency: 'ThankYou Points',
        },
        matchedOffer: { title: 'Welcome bonus spend' },
        reason: 'Whole Foods maps to groceries.',
      }),
    ).toEqual({
      id: 'live-whole-foods',
      merchant: 'Whole Foods',
      category: 'Groceries',
      card: 'Gold Card',
      rank: 1,
      reward: '4x Membership Rewards',
      value: 'Live recommendation',
      reason: 'Whole Foods maps to groceries.',
      matchedBenefits: ['Welcome bonus spend', 'Runner-up: Citi Strata Premier'],
      tags: ['whole foods', 'groceries'],
    });
  });

  it('keeps the live recommendation first and bumps fallback ranks', () => {
    const liveMerchantResult = merchantApiRecommendationToResult({
      merchant: 'Whole Foods',
      category: 'groceries',
      bestCard: {
        id: 'amex-gold',
        issuer: 'American Express',
        name: 'Gold Card',
        multiplier: 4,
      },
      reason: 'Live response wins.',
    });

    expect(merchantResultsForQuery({ query: 'whole', seedMerchantResults: seedResults, liveMerchantResult })).toEqual([
      liveMerchantResult,
      { ...seedResults[1], rank: 3 },
    ]);
  });

  it('returns sorted seeded matches when no live result is ready', () => {
    expect(merchantResultsForQuery({ query: 'delta', seedMerchantResults: seedResults, liveMerchantResult: null })).toEqual([
      seedResults[2],
    ]);
  });

  it('does not show merchant results for a blank query', () => {
    expect(merchantResultsForQuery({ query: '   ', seedMerchantResults: seedResults, liveMerchantResult: seedResults[0] })).toEqual([]);
  });
});

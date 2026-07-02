import { describe, expect, it } from 'vitest';

import { NoEligibleMerchantCardsError, recommendCardForMerchant } from './merchant-context';

describe('recommendCardForMerchant', () => {
  it('normalizes known merchant domains through the merchant catalog', () => {
    const recommendation = recommendCardForMerchant({
      merchant: 'Patagonia Outdoor Clothing',
      url: 'https://www.patagonia.com/shop/mens',
      categoryHint: 'shopping',
    });

    expect(recommendation).toMatchObject({
      merchant: 'Patagonia',
      category: 'general',
      bestCard: {
        id: 'capital-one-venture-x',
        multiplier: 2,
      },
      matchedOffer: {
        title: 'Check issuer merchant offers before checkout.',
        confidence: 'catalog-rule',
      },
    });
    expect(recommendation.reason).toContain('using the Patagonia merchant catalog match');
  });

  it('ranks airline purchases by flight multipliers', () => {
    const recommendation = recommendCardForMerchant({
      url: 'https://www.delta.com/us/en/flight-search/book-a-flight',
      cardProductIds: ['amex-platinum', 'capital-one-venture-x', 'chase-sapphire-reserve'],
    });

    expect(recommendation).toMatchObject({
      merchant: 'Delta Air Lines',
      category: 'flights',
      bestCard: {
        id: 'amex-platinum',
        multiplier: 5,
      },
    });
  });

  it('keeps grocery merchants out of broad dining matches', () => {
    const recommendation = recommendCardForMerchant({
      title: 'Whole Foods Market',
      url: 'https://www.wholefoodsmarket.com/',
      cardProductIds: ['amex-gold', 'capital-one-venture-x'],
    });

    expect(recommendation).toMatchObject({
      merchant: 'Whole Foods',
      category: 'groceries',
      bestCard: {
        id: 'amex-gold',
        multiplier: 4,
      },
    });
  });

  it('returns merchant-specific offer hints when the user has an eligible card', () => {
    const recommendation = recommendCardForMerchant({
      url: 'https://www.ubereats.com/store/example',
      cardProductIds: ['amex-gold', 'chase-sapphire-reserve'],
    });

    expect(recommendation).toMatchObject({
      merchant: 'Uber Eats',
      category: 'dining',
      bestCard: {
        id: 'amex-gold',
        multiplier: 4,
      },
      matchedOffer: {
        title: 'Amex Uber Cash may apply to Uber Eats after enrollment.',
        confidence: 'catalog-rule',
      },
    });
  });

  it('can match catalog aliases without a URL', () => {
    const recommendation = recommendCardForMerchant({
      merchant: "Trader Joe's",
      categoryHint: 'market',
      cardProductIds: ['amex-gold', 'chase-freedom-unlimited'],
    });

    expect(recommendation).toMatchObject({
      merchant: "Trader Joe's",
      category: 'groceries',
      bestCard: {
        id: 'amex-gold',
        multiplier: 4,
      },
    });
  });

  it('rejects explicitly supplied card ids that are not in the catalog', () => {
    expect(() =>
      recommendCardForMerchant({
        merchant: 'Patagonia',
        cardProductIds: ['missing-card'],
      }),
    ).toThrow(NoEligibleMerchantCardsError);
  });
});

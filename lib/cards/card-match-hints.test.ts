import { describe, expect, it } from 'vitest';
import { suggestCardProductMatch, type MatchableCardProduct } from './card-match-hints';

const products: MatchableCardProduct[] = [
  { id: 'amex-gold', issuer: 'American Express', name: 'American Express Gold Card' },
  { id: 'amex-platinum', issuer: 'American Express', name: 'The Platinum Card from American Express' },
  { id: 'capital-one-venture-x', issuer: 'Capital One', name: 'Capital One Venture X Rewards Credit Card' },
  { id: 'chase-sapphire-reserve', issuer: 'Chase', name: 'Chase Sapphire Reserve' },
  { id: 'chase-freedom-unlimited', issuer: 'Chase', name: 'Chase Freedom Unlimited' },
];

describe('suggestCardProductMatch', () => {
  it('matches known Plaid-style account names to catalog aliases', () => {
    expect(
      suggestCardProductMatch({
        accountName: 'Venture X Rewards',
        institutionName: 'Capital One',
        products,
      }),
    ).toEqual(expect.objectContaining({ product: expect.objectContaining({ id: 'capital-one-venture-x' }) }));

    expect(
      suggestCardProductMatch({
        accountName: 'Sapphire Reserve',
        institutionName: 'Chase',
        products,
      }),
    ).toEqual(expect.objectContaining({ product: expect.objectContaining({ id: 'chase-sapphire-reserve' }) }));
  });

  it('does not guess from issuer-only signals', () => {
    expect(
      suggestCardProductMatch({
        accountName: 'Credit Card',
        institutionName: 'American Express',
        products,
      }),
    ).toBeNull();
  });

  it('falls back to product token overlap when aliases are absent', () => {
    expect(
      suggestCardProductMatch({
        accountName: 'Freedom Unlimited Visa',
        institutionName: 'Chase',
        products,
      }),
    ).toEqual(expect.objectContaining({ product: expect.objectContaining({ id: 'chase-freedom-unlimited' }) }));
  });
});

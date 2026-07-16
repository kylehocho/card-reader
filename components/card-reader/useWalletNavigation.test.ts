import { describe, expect, it } from 'vitest';

import {
  buildWalletStackItems,
  resolveSelectedWalletCard,
  shiftWalletPageIndex,
} from './useWalletNavigation';

const cards = [
  { id: 'reserve', issuer: 'Chase', name: 'Sapphire Reserve', last4: '1184' },
  { id: 'gold', issuer: 'American Express', name: 'Gold Card', last4: '2219' },
  { id: 'venture-x', issuer: 'Capital One', name: 'Venture X', last4: '5521' },
];

const emptyCard = { id: 'empty-wallet', issuer: 'Card Reader', name: 'Connect your first card', last4: 'New' };
const fallbackCard = { id: 'fallback', issuer: 'Fallback', name: 'Fallback Card', last4: '0000' };

describe('wallet navigation helpers', () => {
  it('resolves the selected visible card when it exists', () => {
    expect(
      resolveSelectedWalletCard({
        visibleCards: cards,
        selectedId: 'gold',
        isEmptyWallet: false,
        emptyCard,
        fallbackCard,
      }),
    ).toBe(cards[1]);
  });

  it('falls back to the empty-wallet card for signed-in users with no visible cards', () => {
    expect(
      resolveSelectedWalletCard({
        visibleCards: [],
        selectedId: 'missing',
        isEmptyWallet: true,
        emptyCard,
        fallbackCard,
      }),
    ).toBe(emptyCard);
  });

  it('falls back to the first visible card before the global fallback card', () => {
    expect(
      resolveSelectedWalletCard({
        visibleCards: cards,
        selectedId: 'missing',
        isEmptyWallet: false,
        emptyCard,
        fallbackCard,
      }),
    ).toBe(cards[0]);
  });

  it('clamps wallet page shifts to the page bounds', () => {
    expect(shiftWalletPageIndex(0, -1)).toBe(0);
    expect(shiftWalletPageIndex(0, 1)).toBe(1);
    expect(shiftWalletPageIndex(4, 1)).toBe(4);
    expect(shiftWalletPageIndex(4, -1)).toBe(3);
  });

  it('builds the stack from non-selected visible cards plus the add-card action', () => {
    expect(buildWalletStackItems({ visibleCards: cards, selectedId: 'gold', isEmptyWallet: false })).toEqual([
      cards[0],
      cards[2],
      { id: 'add-card', issuer: 'Wallet', name: 'Add Card', last4: 'New' },
    ]);
  });

  it('keeps only the add-card action for an empty signed-in wallet', () => {
    expect(buildWalletStackItems({ visibleCards: [], selectedId: 'missing', isEmptyWallet: true })).toEqual([
      { id: 'add-card', issuer: 'Wallet', name: 'Add Card', last4: 'New' },
    ]);
  });
});

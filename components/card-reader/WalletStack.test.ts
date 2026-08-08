import { describe, expect, it } from 'vitest';

import {
  isAddCardStackItem,
  walletStackItemLayout,
} from './WalletStack';
import type { AddCardStackItem } from './useWalletNavigation';

describe('WalletStack helpers', () => {
  it('maps collapsed stack placement to the existing compressed layout', () => {
    expect(walletStackItemLayout({ index: 2, isExpanded: false, itemCount: 4 })).toEqual({
      top: 54,
      scale: 0.952,
      opacity: 0.9,
      zIndex: 18,
      y: 3,
      whileTapScale: 0.94,
    });
  });

  it('maps expanded stack placement to selectable rows', () => {
    expect(walletStackItemLayout({ index: 2, isExpanded: true, itemCount: 4 })).toEqual({
      top: 136,
      scale: 1,
      opacity: 1,
      zIndex: 2,
      y: 0,
      whileTapScale: 0.988,
    });
  });

  it('identifies the add-card stack action item', () => {
    const addCard: AddCardStackItem = {
      id: 'add-card',
      issuer: 'Wallet',
      name: 'Add Card',
      last4: 'New',
    };

    expect(isAddCardStackItem(addCard)).toBe(true);
    expect(isAddCardStackItem({
      id: 'amex-gold',
      issuer: 'Amex',
      name: 'Gold',
      last4: '1001',
      gradient: 'from-amber-500 to-yellow-300',
    })).toBe(false);
  });
});

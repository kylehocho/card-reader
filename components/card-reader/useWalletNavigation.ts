'use client';

import { useCallback, useMemo, useState } from 'react';

export type Screen = 'wallet' | 'profile' | 'connected-accounts' | 'card-details' | 'notifications' | 'opportunities' | 'use-now' | 'category-guide' | 'concierge';
export type WalletPage = 'benefits' | 'multipliers' | 'rewards' | 'progress' | 'recommendations';

export const walletPages: WalletPage[] = ['benefits', 'multipliers', 'rewards', 'progress', 'recommendations'];

type WalletCardLike = {
  id: string;
  issuer: string;
  name: string;
  last4: string;
};

export type AddCardStackItem = {
  id: 'add-card';
  issuer: 'Wallet';
  name: 'Add Card';
  last4: 'New';
};

export function resolveSelectedWalletCard<Card extends WalletCardLike>({
  visibleCards,
  selectedId,
  isEmptyWallet,
  emptyCard,
  fallbackCard,
}: {
  visibleCards: Card[];
  selectedId: string;
  isEmptyWallet: boolean;
  emptyCard: Card;
  fallbackCard: Card;
}) {
  return visibleCards.find((card) => card.id === selectedId) ?? (isEmptyWallet ? emptyCard : visibleCards[0] ?? fallbackCard);
}

export function shiftWalletPageIndex(currentIndex: number, direction: 1 | -1, pageCount = walletPages.length) {
  const nextIndex = currentIndex + direction;
  if (nextIndex < 0 || nextIndex >= pageCount) return currentIndex;
  return nextIndex;
}

export function buildWalletStackItems<Card extends WalletCardLike>({
  visibleCards,
  selectedId,
  isEmptyWallet,
}: {
  visibleCards: Card[];
  selectedId: string;
  isEmptyWallet: boolean;
}): Array<Card | AddCardStackItem> {
  const addCard: AddCardStackItem = { id: 'add-card', issuer: 'Wallet', name: 'Add Card', last4: 'New' };
  if (isEmptyWallet) return [addCard];

  return [...visibleCards.filter((card) => card.id !== selectedId), addCard];
}

export function useWalletNavigation<Card extends WalletCardLike>({
  emptyCard,
  fallbackCard,
  initialScreen = 'wallet',
  initialSelectedId,
  isEmptyWallet,
  visibleCards,
}: {
  emptyCard: Card;
  fallbackCard: Card;
  initialScreen?: Screen;
  initialSelectedId: string;
  isEmptyWallet: boolean;
  visibleCards: Card[];
}) {
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [walletPageIndex, setWalletPageIndex] = useState(0);
  const [walletSelectionExpanded, setWalletSelectionExpanded] = useState(false);

  const selectedCard = useMemo(
    () =>
      resolveSelectedWalletCard({
        visibleCards,
        selectedId,
        isEmptyWallet,
        emptyCard,
        fallbackCard,
      }),
    [emptyCard, fallbackCard, isEmptyWallet, selectedId, visibleCards],
  );

  const walletStackItems = useMemo(
    () => buildWalletStackItems({ visibleCards, selectedId, isEmptyWallet }),
    [isEmptyWallet, selectedId, visibleCards],
  );

  const selectCard = useCallback((cardId: string) => {
    setSelectedId(cardId);
    setWalletPageIndex(0);
    setWalletSelectionExpanded(false);
  }, []);

  const shiftWalletPage = useCallback((direction: 1 | -1) => {
    setWalletPageIndex((current) => shiftWalletPageIndex(current, direction));
  }, []);

  const resetToWallet = useCallback(
    (nextSelectedId = initialSelectedId) => {
      setSelectedId(nextSelectedId);
      setWalletPageIndex(0);
      setWalletSelectionExpanded(false);
      setScreen('wallet');
    },
    [initialSelectedId],
  );

  return {
    screen,
    selectedCard,
    selectedId,
    selectCard,
    setScreen,
    setSelectedId,
    setWalletPageIndex,
    setWalletSelectionExpanded,
    shiftWalletPage,
    resetToWallet,
    walletPageIndex,
    walletSelectionExpanded,
    walletStackItems,
  };
}

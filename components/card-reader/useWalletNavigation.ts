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

type ConnectedAccountLike = {
  accountId: string;
};

export type WalletSelectionOutcomeSummary = {
  id: 'manual-card-added' | 'plaid-accounts-linked' | 'card-match-saved' | 'connected-account-removed';
  label: string;
  selectedId: string;
  screen?: Screen;
  walletPageIndex?: number;
  scanStep?: 'match';
  manualCardStatus?: 'idle';
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

export function walletCardIdForConnectedAccount(account: ConnectedAccountLike) {
  return `plaid-${account.accountId}`;
}

export function selectedWalletCardIdAfterConnectedAccountRemoval<Account extends ConnectedAccountLike>({
  currentSelectedId,
  fallbackSelectedId,
  remainingAccounts,
  removedAccount,
}: {
  currentSelectedId: string;
  fallbackSelectedId: string;
  remainingAccounts: Account[];
  removedAccount: Account;
}) {
  if (currentSelectedId !== walletCardIdForConnectedAccount(removedAccount)) return currentSelectedId;

  const nextAccount = remainingAccounts[0];
  return nextAccount ? walletCardIdForConnectedAccount(nextAccount) : fallbackSelectedId;
}

export function buildWalletSelectionOutcomeSummary<Account extends ConnectedAccountLike>({
  fallbackSelectedId,
  manualAccount,
  matchedAccount,
  plaidLinkedAccounts,
  remainingAccountsAfterRemoval,
  removedAccount,
  selectedId,
}: {
  fallbackSelectedId: string;
  manualAccount: Account;
  matchedAccount: Account;
  plaidLinkedAccounts: Account[];
  remainingAccountsAfterRemoval: Account[];
  removedAccount: Account;
  selectedId: string;
}): WalletSelectionOutcomeSummary[] {
  const firstPlaidAccount = plaidLinkedAccounts[0];

  return [
    {
      id: 'manual-card-added',
      label: 'Manual card saved',
      selectedId: walletCardIdForConnectedAccount(manualAccount),
      screen: 'wallet',
      manualCardStatus: 'idle',
    },
    {
      id: 'plaid-accounts-linked',
      label: 'Plaid accounts linked',
      selectedId: firstPlaidAccount ? walletCardIdForConnectedAccount(firstPlaidAccount) : selectedId,
      walletPageIndex: 0,
      scanStep: 'match',
    },
    {
      id: 'card-match-saved',
      label: 'Card match saved',
      selectedId: walletCardIdForConnectedAccount(matchedAccount),
    },
    {
      id: 'connected-account-removed',
      label: 'Connected account removed',
      selectedId: selectedWalletCardIdAfterConnectedAccountRemoval({
        currentSelectedId: selectedId,
        fallbackSelectedId,
        remainingAccounts: remainingAccountsAfterRemoval,
        removedAccount,
      }),
    },
  ];
}

export function useWalletSelectionOutcomes<Account extends ConnectedAccountLike>({
  fallbackSelectedId,
  selectedId,
  selectCard,
  setManualCardStatus,
  setScanStep,
  setScreen,
  setSelectedId,
  setWalletPageIndex,
  showSuccessThenClose,
}: {
  fallbackSelectedId: string;
  selectedId: string;
  selectCard: (cardId: string) => void;
  setManualCardStatus: (status: 'idle') => void;
  setScanStep: (step: 'match') => void;
  setScreen: (screen: Screen) => void;
  setSelectedId: (cardId: string) => void;
  setWalletPageIndex: (index: number) => void;
  showSuccessThenClose: (afterClose: () => void) => void;
}) {
  const handleManualCardAdded = useCallback(
    (account: Account) => {
      selectCard(walletCardIdForConnectedAccount(account));
      showSuccessThenClose(() => {
        setScreen('wallet');
        setManualCardStatus('idle');
      });
    },
    [selectCard, setManualCardStatus, setScreen, showSuccessThenClose],
  );

  const handlePlaidAccountsLinked = useCallback(
    (accounts: Account[]) => {
      const firstAddedAccount = accounts[0];
      if (firstAddedAccount) {
        setSelectedId(walletCardIdForConnectedAccount(firstAddedAccount));
      }
      setWalletPageIndex(0);
      setScanStep('match');
    },
    [setScanStep, setSelectedId, setWalletPageIndex],
  );

  const handleCardMatchSaved = useCallback(
    (account: Account) => {
      setSelectedId(walletCardIdForConnectedAccount(account));
    },
    [setSelectedId],
  );

  const handleConnectedAccountRemoved = useCallback(
    (account: Account, remainingAccounts: Account[]) => {
      const nextSelectedId = selectedWalletCardIdAfterConnectedAccountRemoval({
        currentSelectedId: selectedId,
        fallbackSelectedId,
        remainingAccounts,
        removedAccount: account,
      });

      if (nextSelectedId !== selectedId) {
        setSelectedId(nextSelectedId);
      }
    },
    [fallbackSelectedId, selectedId, setSelectedId],
  );

  return {
    handleCardMatchSaved,
    handleConnectedAccountRemoved,
    handleManualCardAdded,
    handlePlaidAccountsLinked,
  };
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

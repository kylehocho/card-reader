'use client';

import { useCallback, useState } from 'react';

export type ScanStep = 'camera' | 'manual' | 'plaid' | 'match' | 'success';

export type ManualCardDraft = {
  issuer: string;
  name: string;
  last4: string;
  isBusiness: boolean;
};

export const defaultManualCardDraft: ManualCardDraft = {
  issuer: 'American Express',
  name: 'Black Card',
  last4: '9999',
  isBusiness: false,
};

export function normalizeManualCardLast4(value: string) {
  return value.replace(/\D/g, '').slice(0, 4);
}

export function useAddCardPresentation(initialDraft: ManualCardDraft = defaultManualCardDraft) {
  const [showScanner, setShowScanner] = useState(false);
  const [scanStep, setScanStep] = useState<ScanStep>('camera');
  const [draftCard, setDraftCard] = useState<ManualCardDraft>(initialDraft);
  const [manualCardProductId, setManualCardProductId] = useState('');

  const openAddCardSheet = useCallback((initialStep: ScanStep = 'plaid') => {
    setShowScanner(true);
    setScanStep(initialStep);
  }, []);

  const closeAddCardSheet = useCallback(() => {
    setShowScanner(false);
  }, []);

  const setDraftIssuer = useCallback((issuer: string) => {
    setDraftCard((draft) => ({ ...draft, issuer }));
  }, []);

  const setDraftName = useCallback((name: string) => {
    setDraftCard((draft) => ({ ...draft, name }));
  }, []);

  const setDraftLast4 = useCallback((last4: string) => {
    setDraftCard((draft) => ({ ...draft, last4: normalizeManualCardLast4(last4) }));
  }, []);

  const setDraftBusiness = useCallback((isBusiness: boolean) => {
    setDraftCard((draft) => ({ ...draft, isBusiness }));
  }, []);

  const showSuccessThenClose = useCallback((onClose: () => void, delayMs = 900) => {
    setScanStep('success');
    window.setTimeout(() => {
      setShowScanner(false);
      onClose();
    }, delayMs);
  }, []);

  return {
    closeAddCardSheet,
    draftCard,
    manualCardProductId,
    openAddCardSheet,
    scanStep,
    setDraftBusiness,
    setDraftIssuer,
    setDraftLast4,
    setDraftName,
    setManualCardProductId,
    setScanStep,
    setShowScanner,
    showScanner,
    showSuccessThenClose,
  };
}

import type { AuthFlow, AuthStatus, ProfileStatus } from '@/components/auth/types';
import { useCallback } from 'react';

export type WalletProtectedDestination = 'add-card' | 'connected-accounts' | 'profile';

export type WalletAccessGateResult =
  | { allowed: true; destination: WalletProtectedDestination }
  | { allowed: false; authFlow: AuthFlow };

export function resolveWalletAccessGate({
  authStatus,
  destination,
  profileStatus,
}: {
  authStatus: AuthStatus;
  destination: WalletProtectedDestination;
  profileStatus: ProfileStatus;
}): WalletAccessGateResult {
  if (authStatus !== 'authenticated') {
    return { allowed: false, authFlow: 'entry' };
  }

  if (profileStatus === 'missing') {
    return { allowed: false, authFlow: 'setup' };
  }

  return { allowed: true, destination };
}

export function useWalletAccessGates({
  authStatus,
  onAuthFlowChange,
  onNavigate,
  onOpenAddCardSheet,
  onPrepareNavigation,
  profileStatus,
}: {
  authStatus: AuthStatus;
  onAuthFlowChange: (flow: AuthFlow) => void;
  onNavigate: (destination: Exclude<WalletProtectedDestination, 'add-card'>) => void;
  onOpenAddCardSheet: () => void;
  onPrepareNavigation?: () => void;
  profileStatus: ProfileStatus;
}) {
  const openProtectedDestination = useCallback(
    (destination: WalletProtectedDestination) => {
      onPrepareNavigation?.();

      const gate = resolveWalletAccessGate({ authStatus, destination, profileStatus });
      if (!gate.allowed) {
        onAuthFlowChange(gate.authFlow);
        return;
      }

      if (destination === 'add-card') {
        onOpenAddCardSheet();
        return;
      }

      onNavigate(destination);
    },
    [authStatus, onAuthFlowChange, onNavigate, onOpenAddCardSheet, onPrepareNavigation, profileStatus],
  );

  return { openProtectedDestination };
}

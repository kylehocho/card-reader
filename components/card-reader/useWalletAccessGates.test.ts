import { describe, expect, it } from 'vitest';

import { resolveWalletAccessGate } from './useWalletAccessGates';

describe('resolveWalletAccessGate', () => {
  it('requires the auth entry sheet before protected wallet destinations', () => {
    expect(
      resolveWalletAccessGate({
        authStatus: 'anonymous',
        destination: 'add-card',
        profileStatus: 'ready',
      }),
    ).toEqual({ allowed: false, authFlow: 'entry' });

    expect(
      resolveWalletAccessGate({
        authStatus: 'loading',
        destination: 'profile',
        profileStatus: 'ready',
      }),
    ).toEqual({ allowed: false, authFlow: 'entry' });
  });

  it('requires profile setup before protected wallet destinations', () => {
    expect(
      resolveWalletAccessGate({
        authStatus: 'authenticated',
        destination: 'connected-accounts',
        profileStatus: 'missing',
      }),
    ).toEqual({ allowed: false, authFlow: 'setup' });
  });

  it('allows ready authenticated users through to the requested destination', () => {
    expect(
      resolveWalletAccessGate({
        authStatus: 'authenticated',
        destination: 'connected-accounts',
        profileStatus: 'ready',
      }),
    ).toEqual({ allowed: true, destination: 'connected-accounts' });
  });
});

'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import type { AuthContextValue } from './AuthProvider.types';
import type { AuthFlow, AuthStatus, ProfileSetupInput, ProfileStatus, UserIdentity } from './types';

const AuthContext = createContext<AuthContextValue | null>(null);

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('anonymous');
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('missing');
  const [authFlow, setAuthFlow] = useState<AuthFlow>('closed');
  const [user, setUser] = useState<UserIdentity | null>(null);

  async function signInWithGoogle() {
    setAuthStatus('loading');
    await wait(500);
    setUser({
      id: 'google-demo',
      email: 'kyle@example.com',
      firstName: 'Kyle',
      displayName: null,
      providers: ['google'],
    });
    setAuthStatus('authenticated');
    setProfileStatus('missing');
    setAuthFlow('setup');
  }

  async function signInWithApple() {
    setAuthStatus('loading');
    await wait(500);
    setUser({
      id: 'apple-demo',
      email: 'kyle@privaterelay.appleid.com',
      firstName: 'Kyle',
      displayName: null,
      providers: ['apple'],
    });
    setAuthStatus('authenticated');
    setProfileStatus('missing');
    setAuthFlow('setup');
  }

  async function signInWithEmail(email: string) {
    setAuthStatus('loading');
    await wait(400);
    setUser({
      id: 'email-demo',
      email,
      firstName: null,
      displayName: null,
      providers: ['email'],
    });
    setAuthStatus('authenticated');
    setProfileStatus('missing');
    setAuthFlow('verify');
  }

  async function confirmEmail() {
    await wait(300);
    setAuthFlow('setup');
  }

  async function completeProfileSetup(input: ProfileSetupInput) {
    await wait(300);
    setUser((current) =>
      current
        ? {
            ...current,
            firstName: input.firstName,
            displayName: input.displayName?.trim() || input.firstName,
          }
        : current,
    );
    setProfileStatus('ready');
    setAuthFlow('closed');
  }

  async function signOut() {
    await wait(150);
    setUser(null);
    setAuthStatus('anonymous');
    setProfileStatus('missing');
    setAuthFlow('closed');
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      authStatus,
      profileStatus,
      authFlow,
      user,
      setAuthFlow,
      signInWithGoogle,
      signInWithApple,
      signInWithEmail,
      confirmEmail,
      completeProfileSetup,
      signOut,
    }),
    [authStatus, profileStatus, authFlow, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export type { AuthContextValue } from './AuthProvider.types';

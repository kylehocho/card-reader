'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';
import type { AuthContextValue } from './AuthProvider.types';
import type { AuthFlow, AuthProviderName, AuthStatus, ProfileSetupInput, ProfileStatus, UserIdentity } from './types';

const AuthContext = createContext<AuthContextValue | null>(null);
const PROFILE_STORAGE_KEY = 'card-reader.profile.v1';
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

type StoredProfile = {
  user: UserIdentity | null;
  profileStatus: ProfileStatus;
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readStoredProfile(): StoredProfile | null {
  if (typeof window === 'undefined') return null;

  try {
    const rawProfile = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!rawProfile) return null;
    const parsedProfile = JSON.parse(rawProfile) as Partial<StoredProfile>;
    if (!parsedProfile.user || parsedProfile.profileStatus !== 'ready') return null;

    return {
      user: parsedProfile.user,
      profileStatus: parsedProfile.profileStatus,
    };
  } catch {
    return null;
  }
}

function providersFromSupabaseUser(authUser: SupabaseUser): AuthProviderName[] {
  const provider = authUser.app_metadata.provider;
  if (provider === 'google' || provider === 'apple' || provider === 'email') return [provider];
  return ['email'];
}

function userFromSupabaseProfile(authUser: SupabaseUser, profile: ProfileRow | null): UserIdentity {
  const metadata = authUser.user_metadata as { full_name?: string; name?: string } | null;
  const metadataName = metadata?.full_name ?? metadata?.name ?? null;
  const fallbackFirstName = metadataName?.split(' ')[0] ?? authUser.email?.split('@')[0] ?? null;

  return {
    id: authUser.id,
    email: authUser.email ?? profile?.email ?? null,
    firstName: profile?.first_name ?? fallbackFirstName,
    displayName: profile?.display_name ?? metadataName,
    providers: providersFromSupabaseUser(authUser),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => getBrowserSupabaseClient());
  const usesSupabase = Boolean(supabase);
  const [initialProfile] = useState<StoredProfile | null>(() => (supabase ? null : readStoredProfile()));
  const [authStatus, setAuthStatus] = useState<AuthStatus>(() => (initialProfile ? 'authenticated' : 'anonymous'));
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>(() => initialProfile?.profileStatus ?? 'missing');
  const [authFlow, setAuthFlow] = useState<AuthFlow>('closed');
  const [user, setUser] = useState<UserIdentity | null>(() => initialProfile?.user ?? null);

  const hydrateSupabaseUser = useCallback(
    async (authUser: SupabaseUser | null) => {
      if (!supabase) return;

      if (!authUser) {
        setUser(null);
        setAuthStatus('anonymous');
        setProfileStatus('missing');
        return;
      }

      const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();

      if (error) {
        console.error('Unable to load profile', error);
      }

      setUser(userFromSupabaseProfile(authUser, profile ?? null));
      setAuthStatus('authenticated');
      setProfileStatus(profile ? 'ready' : 'missing');

      if (!profile) {
        setAuthFlow('setup');
      }
    },
    [supabase],
  );

  useEffect(() => {
    if (!supabase) return;

    void (async () => {
      setAuthStatus('loading');
      const { data } = await supabase.auth.getSession();
      await hydrateSupabaseUser(data.session?.user ?? null);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void hydrateSupabaseUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [hydrateSupabaseUser, supabase]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (usesSupabase) {
      window.localStorage.removeItem(PROFILE_STORAGE_KEY);
      return;
    }

    if (user && profileStatus === 'ready') {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ user, profileStatus }));
      return;
    }

    window.localStorage.removeItem(PROFILE_STORAGE_KEY);
  }, [profileStatus, user, usesSupabase]);

  async function signInWithGoogle() {
    if (supabase) {
      setAuthStatus('loading');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) {
        console.error('Unable to start Google sign-in', error);
        setAuthStatus('anonymous');
      }
      return;
    }

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
    if (supabase) {
      setAuthStatus('loading');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: { redirectTo: window.location.origin },
      });
      if (error) {
        console.error('Unable to start Apple sign-in', error);
        setAuthStatus('anonymous');
      }
      return;
    }

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
    if (supabase) {
      setAuthStatus('loading');
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) {
        console.error('Unable to start email sign-in', error);
        setAuthStatus('anonymous');
        return;
      }
      setAuthStatus('anonymous');
      setAuthFlow('verify');
      return;
    }

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
    if (supabase) {
      setAuthStatus('loading');
      const { data } = await supabase.auth.getSession();
      await hydrateSupabaseUser(data.session?.user ?? null);
      if (!data.session?.user) {
        setAuthStatus('anonymous');
        setAuthFlow('verify');
      }
      return;
    }

    await wait(300);
    setAuthFlow('setup');
  }

  async function completeProfileSetup(input: ProfileSetupInput) {
    if (supabase) {
      setAuthStatus('loading');
      const { data, error: userError } = await supabase.auth.getUser();

      if (userError || !data.user) {
        console.error('Unable to complete profile without a Supabase user', userError);
        setAuthStatus('anonymous');
        setAuthFlow('entry');
        return;
      }

      const firstName = input.firstName.trim();
      const displayName = input.displayName?.trim() || firstName;
      const { data: profile, error } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          email: data.user.email ?? null,
          first_name: firstName,
          display_name: displayName,
          notifications_opt_in: input.notificationsOptIn ?? true,
        })
        .select('*')
        .single();

      if (error) {
        console.error('Unable to save profile', error);
        setAuthStatus('authenticated');
        return;
      }

      setUser(userFromSupabaseProfile(data.user, profile));
      setAuthStatus('authenticated');
      setProfileStatus('ready');
      setAuthFlow('closed');
      return;
    }

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
    if (supabase) {
      await supabase.auth.signOut();
    }

    await wait(150);
    setUser(null);
    setAuthStatus('anonymous');
    setProfileStatus('missing');
    setAuthFlow('closed');
  }

  const value: AuthContextValue = {
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export type { AuthContextValue } from './AuthProvider.types';

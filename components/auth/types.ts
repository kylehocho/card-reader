export type AuthStatus = 'anonymous' | 'loading' | 'authenticated';
export type ProfileStatus = 'missing' | 'ready';
export type AuthFlow = 'closed' | 'entry' | 'email' | 'verify' | 'setup';

export type AuthProviderName = 'email' | 'google' | 'apple';

export type UserIdentity = {
  id: string;
  email: string | null;
  firstName: string | null;
  displayName: string | null;
  providers: AuthProviderName[];
};

export type ProfileSetupInput = {
  firstName: string;
  displayName?: string;
  notificationsOptIn?: boolean;
};

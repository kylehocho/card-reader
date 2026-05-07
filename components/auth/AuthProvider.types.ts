import type { AuthFlow, AuthStatus, ProfileSetupInput, ProfileStatus, UserIdentity } from './types';

export type AuthContextValue = {
  authStatus: AuthStatus;
  profileStatus: ProfileStatus;
  authFlow: AuthFlow;
  user: UserIdentity | null;
  setAuthFlow: (flow: AuthFlow) => void;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
  confirmEmail: () => Promise<void>;
  completeProfileSetup: (input: ProfileSetupInput) => Promise<void>;
  signOut: () => Promise<void>;
};

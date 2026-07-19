'use client';

import AuthEntrySheet from '@/components/auth/AuthEntrySheet';
import EmailAuthFlow from '@/components/auth/EmailAuthFlow';
import ProfileSetupFlow from '@/components/auth/ProfileSetupFlow';
import type { AuthFlow, AuthStatus, ProfileSetupInput, UserIdentity } from '@/components/auth/types';

type ProfileAccessBoundaryProps = {
  authFlow: AuthFlow;
  authStatus: AuthStatus;
  emailDraft: string;
  user: UserIdentity | null;
  onAuthFlowChange: (flow: AuthFlow) => void;
  onEmailDraftChange: (value: string) => void;
  onContinueWithApple: () => Promise<void>;
  onContinueWithGoogle: () => Promise<void>;
  onContinueWithEmail: (email: string) => Promise<void>;
  onConfirmEmail: () => Promise<void>;
  onCompleteProfileSetup: (input: ProfileSetupInput) => Promise<void>;
};

export function emailAuthMode(authFlow: AuthFlow) {
  return authFlow === 'verify' ? 'verify' : 'email';
}

export function emailAuthBackFlow(authFlow: AuthFlow): AuthFlow {
  return authFlow === 'verify' ? 'email' : 'entry';
}

export default function ProfileAccessBoundary({
  authFlow,
  authStatus,
  emailDraft,
  user,
  onAuthFlowChange,
  onEmailDraftChange,
  onContinueWithApple,
  onContinueWithGoogle,
  onContinueWithEmail,
  onConfirmEmail,
  onCompleteProfileSetup,
}: ProfileAccessBoundaryProps) {
  const isAuthLoading = authStatus === 'loading';

  return (
    <>
      <AuthEntrySheet
        isOpen={authFlow === 'entry'}
        isLoading={isAuthLoading}
        onClose={() => onAuthFlowChange('closed')}
        onContinueWithApple={onContinueWithApple}
        onContinueWithGoogle={onContinueWithGoogle}
        onContinueWithEmail={() => onAuthFlowChange('email')}
      />

      <EmailAuthFlow
        isOpen={authFlow === 'email' || authFlow === 'verify'}
        mode={emailAuthMode(authFlow)}
        email={emailDraft}
        isLoading={isAuthLoading}
        onEmailChange={onEmailDraftChange}
        onBack={() => onAuthFlowChange(emailAuthBackFlow(authFlow))}
        onClose={() => onAuthFlowChange('closed')}
        onSubmitEmail={() => onContinueWithEmail(emailDraft)}
        onConfirmVerification={onConfirmEmail}
      />

      <ProfileSetupFlow
        key={user?.id ?? 'anonymous-setup'}
        isOpen={authFlow === 'setup'}
        user={user}
        isLoading={isAuthLoading}
        onSubmit={onCompleteProfileSetup}
      />
    </>
  );
}

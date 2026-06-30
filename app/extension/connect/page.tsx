import type { Metadata } from 'next';
import { AuthProvider } from '@/components/auth/AuthProvider';
import ExtensionConnect from '@/components/extension/ExtensionConnect';

export const metadata: Metadata = {
  title: 'Connect Card Reader Extension',
  description: 'Connect a signed-in Card Reader session to the browser extension.',
};

export default function ExtensionConnectPage() {
  return (
    <AuthProvider>
      <ExtensionConnect />
    </AuthProvider>
  );
}

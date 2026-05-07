import type { Metadata } from 'next';
import { AuthProvider } from '@/components/auth/AuthProvider';
import WalletPrototype from '@/components/card-reader/WalletPrototype';

export const metadata: Metadata = {
  title: 'Card Reader Prototype',
  description: 'Wallet-style UI prototype for a card perks and rewards assistant.',
};

export default function HomePage() {
  return (
    <AuthProvider>
      <WalletPrototype />
    </AuthProvider>
  );
}

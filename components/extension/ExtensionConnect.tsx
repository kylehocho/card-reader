'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';

type SyncState = 'idle' | 'syncing' | 'synced' | 'needs-extension' | 'needs-auth' | 'error';

const RESPONSE_TIMEOUT_MS = 1500;

function apiBaseUrl() {
  if (typeof window === 'undefined') return 'https://card-reader-xi.vercel.app';
  return window.location.origin;
}

function syncSessionWithExtension(params: { authToken: string; authExpiresAt: number | null; userEmail: string | null }) {
  const requestId = crypto.randomUUID();

  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener('message', handleResponse);
      reject(new Error('Install or enable the Card Reader extension, then try again.'));
    }, RESPONSE_TIMEOUT_MS);

    function handleResponse(event: MessageEvent) {
      if (event.source !== window || event.origin !== window.location.origin) return;

      const message = event.data;
      if (message?.type !== 'CARD_READER_AUTH_TOKEN_SAVED' || message.requestId !== requestId) return;

      window.clearTimeout(timeout);
      window.removeEventListener('message', handleResponse);

      if (message.ok) {
        resolve();
        return;
      }

      reject(new Error(message.error || 'The extension could not save this session.'));
    }

    window.addEventListener('message', handleResponse);
    window.postMessage(
      {
        type: 'CARD_READER_SAVE_AUTH_TOKEN',
        requestId,
        apiBaseUrl: apiBaseUrl(),
        authToken: params.authToken,
        authExpiresAt: params.authExpiresAt,
        userEmail: params.userEmail
      },
      window.location.origin,
    );
  });
}

export default function ExtensionConnect() {
  const { authStatus, profileStatus, user, setAuthFlow } = useAuth();
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [statusMessage, setStatusMessage] = useState('Ready to connect this browser session.');
  const supabase = useMemo(() => getBrowserSupabaseClient(), []);
  const canSync = authStatus === 'authenticated' && profileStatus === 'ready' && Boolean(supabase);
  const renderedStatusMessage =
    authStatus === 'anonymous'
      ? 'Sign in before connecting the extension.'
      : !supabase
        ? 'Supabase auth is not configured for this environment.'
        : statusMessage;

  async function handleSync() {
    if (!supabase) return;

    setSyncState('syncing');
    setStatusMessage('Checking your signed-in session...');

    const { data, error } = await supabase.auth.getSession();
    const session = data.session;

    if (error || !session?.access_token) {
      setSyncState('needs-auth');
      setStatusMessage('Sign in again, then reconnect the extension.');
      setAuthFlow('entry');
      return;
    }

    try {
      setStatusMessage('Sending session to the browser extension...');
      await syncSessionWithExtension({
        authToken: session.access_token,
        authExpiresAt: session.expires_at ?? null,
        userEmail: user?.email ?? session.user.email ?? null,
      });
      setSyncState('synced');
      setStatusMessage('Extension connected. Popup recommendations now use your synced wallet.');
    } catch (syncError) {
      setSyncState('needs-extension');
      setStatusMessage(syncError instanceof Error ? syncError.message : 'Unable to reach the Card Reader extension.');
    }
  }

  return (
    <main id="main-content" className="min-h-screen bg-[#060816] px-4 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[560px] flex-col justify-center">
        <section className="rounded-[28px] border border-white/12 bg-[rgba(118,118,128,0.18)] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-white/48">Card Reader Extension</p>
          <h1 className="mt-2 text-[30px] font-semibold leading-tight tracking-normal text-white">Connect signed-in recommendations</h1>
          <p className="mt-3 text-[15px] leading-6 text-white/66">
            Link this browser session to the extension so merchant recommendations use your synced cards instead of the demo catalog.
          </p>

          <div className="mt-5 rounded-[18px] border border-white/10 bg-black/18 px-4 py-3">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-white/42">Status</p>
            <p className="mt-1 text-[15px] leading-6 text-white/78">{renderedStatusMessage}</p>
          </div>

          {user?.email && (
            <div className="mt-3 rounded-[18px] border border-white/10 bg-black/18 px-4 py-3">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-white/42">Signed In</p>
              <p className="mt-1 truncate text-[15px] text-white/78">{user.email}</p>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSync}
              disabled={!canSync || syncState === 'syncing'}
              className="rounded-full bg-white px-4 py-2.5 text-[14px] font-semibold text-[#060816] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {syncState === 'syncing' ? 'Connecting' : syncState === 'synced' ? 'Reconnect session' : 'Connect extension'}
            </button>
            {authStatus !== 'authenticated' && (
              <button type="button" onClick={() => setAuthFlow('entry')} className="rounded-full bg-white/10 px-4 py-2.5 text-[14px] font-semibold text-white/86">
                Sign in
              </button>
            )}
            <Link href="/" className="rounded-full bg-white/10 px-4 py-2.5 text-[14px] font-semibold text-white/86">
              Back to wallet
            </Link>
          </div>

          {syncState === 'needs-extension' && (
            <p className="mt-4 text-[13px] leading-5 text-white/54">The extension was not detected in this browser.</p>
          )}
        </section>
      </div>
    </main>
  );
}

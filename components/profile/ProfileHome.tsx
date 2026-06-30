'use client';

import { useState } from 'react';
import type { AuthProviderName, UserIdentity } from '@/components/auth/types';

type ProfileHomeProps = {
  user: UserIdentity;
  connectedAccountsCount: number;
  onBack: () => void;
  onOpenNotifications: () => void;
  onOpenConnectedAccounts: () => void;
  onSignOut: () => Promise<void>;
};

const appleInfoFontStyle = {
  fontFamily: '"SF Pro Text", "SF Pro Display", "SF Pro Icons", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif',
} as const;

const providerTone: Record<AuthProviderName, string> = {
  apple: 'bg-white text-black',
  google: 'bg-sky-400/20 text-sky-100',
  email: 'bg-teal-300/20 text-teal-50',
};

export default function ProfileHome({ user, connectedAccountsCount, onBack, onOpenNotifications, onOpenConnectedAccounts, onSignOut }: ProfileHomeProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const title = user.displayName || user.firstName || 'Your profile';
  const subtitle = user.email || 'No email connected yet';
  const initial = title.charAt(0).toUpperCase();
  const providerSummary = user.providers.map((provider) => provider[0].toUpperCase() + provider.slice(1)).join(' · ');
  const connectedAccountsLabel =
    connectedAccountsCount > 0 ? `${connectedAccountsCount} synced card${connectedAccountsCount === 1 ? '' : 's'}` : 'No synced cards';

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await onSignOut();
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <section className="space-y-4" style={appleInfoFontStyle}>
      <div className="mb-1 flex items-center justify-between px-1">
        <button type="button" onClick={onBack} className="rounded-full bg-[#2c2c2e] px-3 py-1.5 text-sm font-medium text-white/88">
          Back
        </button>
        <h2 className="text-[17px] font-semibold tracking-normal text-white">Profile</h2>
        <div className="w-[56px]" />
      </div>

      <div className="relative overflow-hidden rounded-[26px] border border-white/12 bg-[linear-gradient(180deg,rgba(82,91,104,0.34),rgba(35,39,47,0.34))] px-4 py-4 shadow-[0_10px_24px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6e7480_0%,#282c35_100%)] text-[26px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[22px] font-semibold tracking-normal text-white">{title}</p>
            <p className="mt-1 truncate text-[14px] text-white/68">{subtitle}</p>
            <p className="mt-1 text-[12px] uppercase tracking-[0.16em] text-white/42">{providerSummary || 'Signed in'}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {user.providers.map((provider) => (
            <span key={provider} className={`rounded-full px-3 py-1.5 text-[12px] font-medium capitalize ${providerTone[provider]}`}>
              {provider}
            </span>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            ['Profile', 'Ready'],
            ['Cards', connectedAccountsCount > 0 ? String(connectedAccountsCount) : '0'],
            ['Alerts', 'On'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[18px] border border-white/10 bg-black/15 px-3 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">{label}</p>
              <p className="mt-1 text-[15px] font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-white/12 bg-[rgba(118,118,128,0.24)] shadow-[0_10px_24px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl">
        {[
          { label: 'Synced cards', detail: connectedAccountsLabel, action: connectedAccountsCount > 0 ? 'Manage' : 'Connect', onClick: onOpenConnectedAccounts },
          { label: 'Alerts', detail: 'Recommendation and benefit notifications', action: 'Open', onClick: onOpenNotifications },
          { label: 'Identity', detail: subtitle, action: null, onClick: undefined },
        ].map((item, index, arr) => (
          <div key={item.label}>
            <button type="button" onClick={item.onClick} disabled={!item.onClick} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left disabled:cursor-default">
              <div className="min-w-0">
                <span className="text-[16px] tracking-[-0.01em] text-white">{item.label}</span>
                <p className="mt-0.5 truncate text-[13px] text-white/56">{item.detail}</p>
              </div>
              {item.action ? (
                <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-[13px] font-medium text-white/78">{item.action}</span>
              ) : (
                <span className="shrink-0 text-[18px] text-white/28">✓</span>
              )}
            </button>
            {index < arr.length - 1 && <div className="mx-4 h-px bg-white/12" />}
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-[24px] border border-white/12 bg-[rgba(118,118,128,0.24)] px-4 py-4 shadow-[0_10px_24px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[17px] font-semibold tracking-normal text-white">Account access</p>
            <p className="mt-1 text-[13px] leading-5 text-white/62">Signed in as {subtitle}.</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-rose-50/90 disabled:cursor-wait disabled:opacity-55"
          >
            {isSigningOut ? 'Signing out' : 'Sign out'}
          </button>
        </div>
      </div>
    </section>
  );
}

'use client';

import { useMemo, useState } from 'react';
import type { UserIdentity } from './types';

type ProfileSetupFlowProps = {
  isOpen: boolean;
  user: UserIdentity | null;
  isLoading?: boolean;
  onSubmit: (input: { firstName: string; displayName?: string; notificationsOptIn?: boolean }) => Promise<void>;
};

const appleInfoFontStyle = {
  fontFamily: '"SF Pro Text", "SF Pro Display", "SF Pro Icons", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif',
} as const;

export default function ProfileSetupFlow({ isOpen, user, isLoading = false, onSubmit }: ProfileSetupFlowProps) {
  const fallbackName = useMemo(() => user?.firstName ?? user?.email?.split('@')[0] ?? '', [user]);
  const [firstName, setFirstName] = useState(fallbackName);
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [notificationsOptIn, setNotificationsOptIn] = useState(true);
  const selectedProvider = user?.providers[0] ?? 'email';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/55 px-3 pb-3 pt-10 backdrop-blur-sm" style={appleInfoFontStyle}>
      <div className="relative mx-auto w-full max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[32px] border border-white/10 bg-[rgba(20,20,24,0.96)] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.05)] sm:max-w-md">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.08),transparent_30%)]" />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">Setup</p>
              <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-white">Finish your profile</h2>
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-white/58">
              {selectedProvider}
            </div>
          </div>
          <p className="mt-2 text-[14px] leading-5 text-white/68">Keep this intentionally light. We just need enough to personalize recommendations and future card sync.</p>
        </div>

        <div className="relative mt-5 rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,#181d28_0%,#0f1116_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/42">Profile preview</p>
              <p className="mt-2 text-[20px] font-semibold tracking-[-0.02em] text-white">{displayName || firstName || 'Your profile'}</p>
              <p className="mt-1 text-[13px] text-white/56">{user?.email ?? 'Email will appear here'}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-[18px] font-semibold text-white">
              {(displayName || firstName || 'Y').charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        <div className="relative mt-5 space-y-3">
          <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
            <label className="text-[11px] uppercase tracking-[0.22em] text-white/42">First name</label>
            <input
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              placeholder="Kyle"
              className="mt-3 w-full rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-[16px] text-white outline-none placeholder:text-white/28"
            />
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
            <label className="text-[11px] uppercase tracking-[0.22em] text-white/42">Display name</label>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Kyle Harrison"
              className="mt-3 w-full rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-[16px] text-white outline-none placeholder:text-white/28"
            />
          </div>

          <button
            type="button"
            onClick={() => setNotificationsOptIn((value) => !value)}
            className="flex w-full items-center justify-between rounded-[26px] border border-white/10 bg-white/[0.04] px-4 py-4 text-left"
          >
            <div>
              <p className="text-[15px] font-medium text-white">Get benefit reminders</p>
              <p className="mt-1 text-[13px] text-white/58">Opt into expiring credit nudges and &quot;use this card now&quot; prompts</p>
            </div>
            <div className={`relative h-8 w-13 rounded-full p-1 transition ${notificationsOptIn ? 'bg-[#34c759]' : 'bg-white/15'}`}>
              <span className={`block h-6 w-6 rounded-full bg-white shadow transition ${notificationsOptIn ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </button>
        </div>

        <button
          type="button"
          onClick={() => onSubmit({ firstName, displayName, notificationsOptIn })}
          disabled={!firstName.trim() || isLoading}
          className="relative mt-5 w-full rounded-full bg-white px-4 py-3 text-sm font-medium text-[#0d1117] disabled:opacity-45"
        >
          Create profile
        </button>
      </div>
    </div>
  );
}

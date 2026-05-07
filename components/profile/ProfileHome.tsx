'use client';

import type { AuthProviderName, UserIdentity } from '@/components/auth/types';

type ProfileHomeProps = {
  user: UserIdentity;
  onBack: () => void;
  onOpenNotifications: () => void;
};

const appleInfoFontStyle = {
  fontFamily: '"SF Pro Text", "SF Pro Display", "SF Pro Icons", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif',
} as const;

const providerTone: Record<AuthProviderName, string> = {
  apple: 'bg-white text-black',
  google: 'bg-sky-400/20 text-sky-100',
  email: 'bg-emerald-400/20 text-emerald-100',
};

export default function ProfileHome({ user, onBack, onOpenNotifications }: ProfileHomeProps) {
  const title = user.displayName || user.firstName || 'Your profile';
  const subtitle = user.email || 'No email connected yet';
  const initial = title.charAt(0).toUpperCase();
  const providerSummary = user.providers.map((provider) => provider[0].toUpperCase() + provider.slice(1)).join(' · ');

  return (
    <section className="space-y-4" style={appleInfoFontStyle}>
      <div className="mb-1 flex items-center justify-between px-1">
        <button type="button" onClick={onBack} className="rounded-full bg-[#2c2c2e] px-3 py-1.5 text-sm font-medium text-white/88">
          Back
        </button>
        <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-white">Profile</h2>
        <div className="w-[56px]" />
      </div>

      <div className="relative overflow-hidden rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(118,118,128,0.34),rgba(118,118,128,0.18))] px-4 py-4 shadow-[0_10px_24px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(96,165,250,0.10),transparent_32%)]" />
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6e7480_0%,#282c35_100%)] text-[26px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[22px] font-semibold tracking-[-0.03em] text-white">{title}</p>
            <p className="mt-1 text-[14px] text-white/68">{subtitle}</p>
            <p className="mt-1 text-[12px] uppercase tracking-[0.18em] text-white/42">{providerSummary || 'Profile connected'}</p>
          </div>
        </div>

        <div className="relative mt-4 flex flex-wrap gap-2">
          {user.providers.map((provider) => (
            <span key={provider} className={`rounded-full px-3 py-1.5 text-[12px] font-medium capitalize ${providerTone[provider]}`}>
              {provider}
            </span>
          ))}
        </div>

        <div className="relative mt-4 grid grid-cols-3 gap-2">
          {[
            ['Profile', 'Ready'],
            ['Alerts', 'On'],
            ['Sync', 'Later'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[20px] border border-white/10 bg-black/15 px-3 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">{label}</p>
              <p className="mt-1 text-[15px] font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-[26px] border border-white/12 bg-[rgba(118,118,128,0.24)] shadow-[0_10px_24px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl">
        {[
          ['Personal details', 'Name, email, and profile basics'],
          ['Connected accounts', 'Apple, Google, and email sign-in methods'],
          ['Future card sync', 'Issuer connections and account linking will live here'],
        ].map(([label, detail], index, arr) => (
          <div key={label}>
            <button type="button" className="flex w-full items-center justify-between px-4 py-3.5 text-left">
              <div>
                <span className="text-[16px] tracking-[-0.01em] text-white">{label}</span>
                <p className="mt-0.5 text-[13px] text-white/56">{detail}</p>
              </div>
              <span className="text-[18px] text-white/38">›</span>
            </button>
            {index < arr.length - 1 && <div className="mx-4 h-px bg-white/12" />}
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-[26px] border border-white/12 bg-[rgba(118,118,128,0.24)] px-4 py-4 shadow-[0_10px_24px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[17px] font-semibold tracking-[-0.02em] text-white">Alerts and recommendations</p>
            <p className="mt-1 text-[13px] leading-5 text-white/62">This is where profile-level control can shape the app: reminders, proactive nudges, and default card ranking behavior.</p>
          </div>
          <button type="button" onClick={onOpenNotifications} className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white/82">
            Open
          </button>
        </div>

        <div className="mt-4 rounded-[22px] border border-white/10 bg-black/15 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Next best surface</p>
          <p className="mt-1 text-[15px] leading-6 text-white/78">Profile should become the place where linked identities, reminder preferences, and later issuer connections all feel coherent.</p>
        </div>
      </div>
    </section>
  );
}

'use client';

type AuthEntrySheetProps = {
  isOpen: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onContinueWithApple: () => Promise<void>;
  onContinueWithGoogle: () => Promise<void>;
  onContinueWithEmail: () => void;
};

const appleInfoFontStyle = {
  fontFamily: '"SF Pro Text", "SF Pro Display", "SF Pro Icons", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif',
} as const;

export default function AuthEntrySheet({
  isOpen,
  isLoading = false,
  onClose,
  onContinueWithApple,
  onContinueWithGoogle,
  onContinueWithEmail,
}: AuthEntrySheetProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/55 px-3 pb-3 pt-10 backdrop-blur-sm" style={appleInfoFontStyle}>
      <button type="button" aria-label="Close auth" onClick={onClose} className="absolute inset-0" />
      <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-[32px] border border-white/10 bg-[rgba(20,20,24,0.92)] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.13),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(96,165,250,0.12),transparent_32%)]" />
        <div className="flex items-start justify-between gap-4">
          <div className="relative">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">Profile</p>
            <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-white">Create your wallet profile</h2>
            <p className="mt-2 max-w-[280px] text-[14px] leading-5 text-white/68">Save cards, sync providers later, and make recommendations personal from the start.</p>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] text-white/70">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              Fast sign-in, profile first, card sync later
            </div>
          </div>
          <button type="button" onClick={onClose} className="relative rounded-full bg-white/8 px-3 py-1.5 text-sm text-white/80">Close</button>
        </div>

        <div className="relative mt-5 space-y-3">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center justify-between rounded-[22px] bg-[linear-gradient(135deg,#1c2330_0%,#0f1116_100%)] px-4 py-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/46">Why sign in</p>
                <p className="mt-2 text-[16px] font-semibold tracking-[-0.02em]">Save card strategy by profile</p>
                <p className="mt-1 text-[13px] leading-5 text-white/62">Let the wallet learn your preferred sign-in, reminders, and recommendation defaults.</p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/54">v1</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onContinueWithApple}
            disabled={isLoading}
            className="flex w-full items-center justify-between rounded-[24px] bg-white px-4 py-4 text-left text-[#0f1115] transition hover:opacity-95 disabled:opacity-60"
          >
            <div>
              <p className="text-[15px] font-semibold">Continue with Apple</p>
              <p className="mt-1 text-[13px] text-[#0f1115]/65">Fastest path for iPhone-native sign-in</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-black/6 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-black/55">Recommended</span>
              <span className="text-xl"></span>
            </div>
          </button>

          <button
            type="button"
            onClick={onContinueWithGoogle}
            disabled={isLoading}
            className="flex w-full items-center justify-between rounded-[24px] border border-white/12 bg-white/6 px-4 py-4 text-left text-white transition hover:bg-white/10 disabled:opacity-60"
          >
            <div>
              <p className="text-[15px] font-semibold">Continue with Google</p>
              <p className="mt-1 text-[13px] text-white/62">Import identity cleanly and keep setup short</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs uppercase tracking-[0.18em] text-white/60">G</span>
          </button>

          <button
            type="button"
            onClick={onContinueWithEmail}
            disabled={isLoading}
            className="flex w-full items-center justify-between rounded-[24px] border border-dashed border-white/16 bg-white/[0.03] px-4 py-4 text-left text-white transition hover:bg-white/[0.06] disabled:opacity-60"
          >
            <div>
              <p className="text-[15px] font-semibold">Continue with email</p>
              <p className="mt-1 text-[13px] text-white/62">Manual entry with magic link or code later</p>
            </div>
            <span className="text-lg text-white/44">→</span>
          </button>

          <p className="px-1 text-center text-[12px] leading-5 text-white/42">No passwords in this prototype flow. Email stays fallback-only unless you choose it.</p>
        </div>
      </div>
    </div>
  );
}

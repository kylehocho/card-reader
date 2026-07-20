'use client';

type EmailAuthFlowProps = {
  isOpen: boolean;
  mode: 'email' | 'verify';
  email: string;
  isLoading?: boolean;
  onEmailChange: (value: string) => void;
  onBack: () => void;
  onClose: () => void;
  onSubmitEmail: () => Promise<void>;
  onConfirmVerification: () => Promise<void>;
};

const appleInfoFontStyle = {
  fontFamily: '"SF Pro Text", "SF Pro Display", "SF Pro Icons", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif',
} as const;

export default function EmailAuthFlow({
  isOpen,
  mode,
  email,
  isLoading = false,
  onEmailChange,
  onBack,
  onClose,
  onSubmitEmail,
  onConfirmVerification,
}: EmailAuthFlowProps) {
  if (!isOpen) return null;

  const isVerify = mode === 'verify';

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/55 px-3 pb-3 pt-10 backdrop-blur-sm" style={appleInfoFontStyle}>
      <button type="button" aria-label="Close email auth" onClick={onClose} className="absolute inset-0" />
      <div className="relative mx-auto w-full max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[32px] border border-white/10 bg-[rgba(20,20,24,0.95)] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.05)] sm:max-w-md">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(52,211,153,0.10),transparent_28%)]" />
        <div className="flex items-center justify-between">
          <button type="button" onClick={onBack} className="relative rounded-full bg-white/8 px-3 py-1.5 text-sm text-white/80">Back</button>
          <div className="relative flex items-center gap-1.5">
            <span className={`h-1.5 w-6 rounded-full ${!isVerify ? 'bg-white' : 'bg-white/20'}`} />
            <span className={`h-1.5 w-6 rounded-full ${isVerify ? 'bg-white' : 'bg-white/20'}`} />
          </div>
          <button type="button" onClick={onClose} className="relative rounded-full bg-white/8 px-3 py-1.5 text-sm text-white/80">Close</button>
        </div>

        {!isVerify ? (
          <>
            <div className="relative mt-5 rounded-[28px] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">Email</p>
              <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-white">Enter your email</h2>
              <p className="mt-2 text-[14px] leading-5 text-white/68">We’ll use this for profile access and a clean fallback if social sign-in changes later.</p>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] text-white/62">
                <span className="text-white/40">✦</span>
                No password setup in v1
              </div>
            </div>

            <div className="relative mt-4 rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
              <label className="text-[11px] uppercase tracking-[0.22em] text-white/42">Email address</label>
              <input
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
                placeholder="kyle@example.com"
                className="mt-3 w-full rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-[16px] text-white outline-none placeholder:text-white/28"
              />
            </div>

            <button
              type="button"
              onClick={onSubmitEmail}
              disabled={!email.trim() || isLoading}
              className="relative mt-5 w-full rounded-full bg-white px-4 py-3 text-sm font-medium text-[#0d1117] disabled:opacity-45"
            >
              Continue with email
            </button>
          </>
        ) : (
          <>
            <div className="relative mt-5 rounded-[28px] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">Check your inbox</p>
              <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-white">Verify email</h2>
              <p className="mt-2 text-[14px] leading-5 text-white/68">We sent a magic-link style verification to <span className="text-white">{email}</span>. For the prototype, continue below.</p>
            </div>

            <div className="relative mt-4 rounded-[26px] border border-emerald-300/16 bg-emerald-400/10 p-4 text-[14px] leading-5 text-white/78">
              <p className="font-medium text-white">Verification pending</p>
              <p className="mt-1">This becomes the home for OTP entry, magic-link state, resend controls, and deep-link success copy.</p>
            </div>

            <div className="relative mt-3 grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((slot) => (
                <div key={slot} className="rounded-[18px] border border-white/10 bg-white/[0.04] py-4 text-center text-[20px] font-semibold text-white/40">
                  •
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={onConfirmVerification}
              disabled={isLoading}
              className="relative mt-5 w-full rounded-full bg-white px-4 py-3 text-sm font-medium text-[#0d1117] disabled:opacity-45"
            >
              I verified my email
            </button>
          </>
        )}
      </div>
    </div>
  );
}

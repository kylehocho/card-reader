'use client';

type ProfileMenuProps = {
  isOpen: boolean;
  isAuthenticated: boolean;
  onCreateProfile: () => void;
  onSignIn: () => void;
  onOpenProfile: () => void;
  onOpenConnectedAccounts: () => void;
  onSignOut: () => Promise<void>;
};

const appleInfoFontStyle = {
  fontFamily: '"SF Pro Text", "SF Pro Display", "SF Pro Icons", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif',
} as const;

export default function ProfileMenu({
  isOpen,
  isAuthenticated,
  onCreateProfile,
  onSignIn,
  onOpenProfile,
  onOpenConnectedAccounts,
  onSignOut,
}: ProfileMenuProps) {
  if (!isOpen) return null;

  return (
    <div
      className="absolute right-0 top-12 z-40 w-[224px] overflow-hidden rounded-[24px] border border-white/10 bg-[rgba(118,118,128,0.24)] shadow-[0_18px_40px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl"
      style={appleInfoFontStyle}
    >
      {!isAuthenticated ? (
        <>
          <button type="button" onClick={onCreateProfile} className="flex w-full items-center px-4 py-3.5 text-left text-[15px] font-medium text-white/92 transition hover:bg-white/[0.05]">
            Create profile
          </button>
          <div className="mx-4 h-px bg-white/10" />
          <button type="button" onClick={onSignIn} className="flex w-full items-center px-4 py-3.5 text-left text-[15px] font-medium text-white/92 transition hover:bg-white/[0.05]">
            Sign in
          </button>
        </>
      ) : (
        <>
          <button type="button" onClick={onOpenProfile} className="flex w-full items-center px-4 py-3.5 text-left text-[15px] font-medium text-white/92 transition hover:bg-white/[0.05]">
            Profile
          </button>
          <div className="mx-4 h-px bg-white/10" />
          <button type="button" onClick={onOpenConnectedAccounts} className="flex w-full items-center px-4 py-3.5 text-left text-[15px] font-medium text-white/92 transition hover:bg-white/[0.05]">
            Connected accounts
          </button>
          <div className="mx-4 h-px bg-white/10" />
          <button type="button" onClick={onSignOut} className="flex w-full items-center px-4 py-3.5 text-left text-[15px] font-medium text-rose-100 transition hover:bg-white/[0.05]">
            Sign out
          </button>
        </>
      )}
    </div>
  );
}

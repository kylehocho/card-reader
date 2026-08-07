'use client';

import type { PlaidConnectedAccount } from './types';

type ConnectedAccountRemovalSheetProps = {
  account: PlaidConnectedAccount;
  isRemoving: boolean;
  onCancel: () => void;
  onRemove: (account: PlaidConnectedAccount) => void;
};

const appleInfoFontStyle = {
  fontFamily: '"SF Pro Text", "SF Pro Display", "SF Pro Icons", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif',
} as const;

export function connectedAccountRemovalTitle(account: PlaidConnectedAccount) {
  return `Remove ${account.cardProductName ?? account.name}?`;
}

export function connectedAccountRemovalButtonLabel(isRemoving: boolean) {
  return isRemoving ? 'Removing' : 'Remove';
}

export default function ConnectedAccountRemovalSheet({
  account,
  isRemoving,
  onCancel,
  onRemove,
}: ConnectedAccountRemovalSheetProps) {
  return (
    <div className="absolute inset-0 z-40 flex items-end bg-black/48 px-4 pb-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="remove-connected-account-title">
      <div className="w-full rounded-[30px] border border-white/12 bg-[#151922] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.42)]" style={appleInfoFontStyle}>
        <p id="remove-connected-account-title" className="text-[17px] font-semibold tracking-[-0.02em] text-white">
          {connectedAccountRemovalTitle(account)}
        </p>
        <p className="mt-2 text-sm leading-6 text-white/68">
          This removes the connected account and its card match from this wallet. You can add it again later from Connected Accounts.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full bg-white/10 px-4 py-3 text-sm font-medium text-white/82"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isRemoving}
            onClick={() => onRemove(account)}
            className="rounded-full bg-rose-300 px-4 py-3 text-sm font-semibold text-[#2d0508] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {connectedAccountRemovalButtonLabel(isRemoving)}
          </button>
        </div>
      </div>
    </div>
  );
}

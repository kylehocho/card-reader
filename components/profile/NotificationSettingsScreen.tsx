'use client';

import {
  notificationSettingRows,
  useNotificationSettings,
} from '@/components/profile/useNotificationSettings';

type NotificationSettingsScreenProps = {
  onBack: () => void;
};

const appleInfoFontStyle = {
  fontFamily: '"SF Pro Text", "SF Pro Display", "SF Pro Icons", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif',
} as const;

export default function NotificationSettingsScreen({ onBack }: NotificationSettingsScreenProps) {
  const { settings, toggleSetting } = useNotificationSettings();

  return (
    <section className="space-y-3" style={appleInfoFontStyle}>
      <div className="mb-1 flex items-center justify-between px-1">
        <button type="button" onClick={onBack} className="rounded-full bg-[#2c2c2e] px-3 py-1.5 text-sm font-medium text-white/88">
          Back
        </button>
        <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-white">Notifications</h2>
        <div className="w-[56px]" />
      </div>

      <div className="overflow-hidden rounded-[26px] border border-white/12 bg-[rgba(118,118,128,0.24)] shadow-[0_10px_24px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl">
        {notificationSettingRows.map((row, index, rows) => (
          <div key={row.key}>
            <div className="flex items-center justify-between px-4 py-3.5">
              <p className="text-[16px] tracking-[-0.01em] text-white">{row.label}</p>
              <button
                type="button"
                aria-pressed={settings[row.key]}
                onClick={() => toggleSetting(row.key)}
                className={`relative h-8 w-13 rounded-full p-1 transition ${settings[row.key] ? 'bg-[#34c759]' : 'bg-white/15'}`}
              >
                <span className={`block h-6 w-6 rounded-full bg-white shadow transition ${settings[row.key] ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
            {index < rows.length - 1 && <div className="mx-4 h-px bg-white/12" />}
          </div>
        ))}
      </div>
    </section>
  );
}

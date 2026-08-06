'use client';

import { useState } from 'react';

export type NotificationSettings = {
  allowNotifications: boolean;
  paymentDue: boolean;
  benefitExpiring: boolean;
  spendMilestones: boolean;
};

export type NotificationSettingKey = keyof NotificationSettings;

export const defaultNotificationSettings: NotificationSettings = {
  allowNotifications: true,
  paymentDue: true,
  benefitExpiring: true,
  spendMilestones: false,
};

export const notificationSettingRows: Array<{ label: string; key: NotificationSettingKey }> = [
  { label: 'Allow Notifications', key: 'allowNotifications' },
  { label: 'Notify Me When Payment Is Due', key: 'paymentDue' },
  { label: 'Benefit Expiring', key: 'benefitExpiring' },
  { label: 'Spend Milestones', key: 'spendMilestones' },
];

export function toggleNotificationSetting(settings: NotificationSettings, key: NotificationSettingKey): NotificationSettings {
  return {
    ...settings,
    [key]: !settings[key],
  };
}

export function useNotificationSettings(initialSettings: NotificationSettings = defaultNotificationSettings) {
  const [settings, setSettings] = useState<NotificationSettings>(initialSettings);

  function toggleSetting(key: NotificationSettingKey) {
    setSettings((current) => toggleNotificationSetting(current, key));
  }

  return { settings, toggleSetting };
}

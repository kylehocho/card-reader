import { describe, expect, it } from 'vitest';

import {
  defaultNotificationSettings,
  notificationSettingRows,
  toggleNotificationSetting,
  type NotificationSettings,
} from './useNotificationSettings';

describe('notification settings helpers', () => {
  it('keeps the current default notification preferences stable', () => {
    expect(defaultNotificationSettings).toEqual({
      allowNotifications: true,
      paymentDue: true,
      benefitExpiring: true,
      spendMilestones: false,
    });
  });

  it('defines the profile notification rows in display order', () => {
    expect(notificationSettingRows.map((row) => row.key)).toEqual([
      'allowNotifications',
      'paymentDue',
      'benefitExpiring',
      'spendMilestones',
    ]);
  });

  it('toggles one setting without mutating the rest of the settings object', () => {
    const current: NotificationSettings = {
      allowNotifications: true,
      paymentDue: true,
      benefitExpiring: false,
      spendMilestones: false,
    };

    expect(toggleNotificationSetting(current, 'paymentDue')).toEqual({
      allowNotifications: true,
      paymentDue: false,
      benefitExpiring: false,
      spendMilestones: false,
    });
    expect(current.paymentDue).toBe(true);
  });
});

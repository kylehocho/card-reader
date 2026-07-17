import { describe, expect, it } from 'vitest';

import { defaultManualCardDraft, normalizeManualCardLast4 } from './useAddCardPresentation';

describe('add-card presentation helpers', () => {
  it('starts anonymous manual-card demos with a stable card draft', () => {
    expect(defaultManualCardDraft).toEqual({
      issuer: 'American Express',
      name: 'Black Card',
      last4: '9999',
      isBusiness: false,
    });
  });

  it('keeps only the first four digits for manual card last four input', () => {
    expect(normalizeManualCardLast4('12a34b56')).toBe('1234');
    expect(normalizeManualCardLast4('•••• 9876')).toBe('9876');
    expect(normalizeManualCardLast4('x')).toBe('');
  });
});

import { describe, expect, it } from 'vitest';

import { emailAuthBackFlow, emailAuthMode } from './ProfileAccessBoundary';

describe('ProfileAccessBoundary helpers', () => {
  it('maps auth flow to the email sheet mode', () => {
    expect(emailAuthMode('email')).toBe('email');
    expect(emailAuthMode('verify')).toBe('verify');
    expect(emailAuthMode('entry')).toBe('email');
    expect(emailAuthMode('closed')).toBe('email');
    expect(emailAuthMode('setup')).toBe('email');
  });

  it('routes email sheet back navigation to the prior auth step', () => {
    expect(emailAuthBackFlow('verify')).toBe('email');
    expect(emailAuthBackFlow('email')).toBe('entry');
    expect(emailAuthBackFlow('entry')).toBe('entry');
  });
});

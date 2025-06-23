/**
 * Test file for rain chance formatter utility
 * Run with: npm test rainChanceFormatter.test.js
 */

import {
  formatRainChance,
  getRainChanceExplanation,
  getRainChanceColorClass,
  getRainChanceIcon
} from './rainChanceFormatter.js';

// A proper testing framework should be used here (e.g., Jest).
// The following is just a placeholder illustrating how tests would look.

describe('rainChanceFormatter', () => {
  it('formatRainChance formats correctly in English', () => {
    expect(formatRainChance(10, 'en', true, 'full')).toBe('Very Low (10%)');
    expect(formatRainChance(35, 'en', true, 'full')).toBe('Low (35%)');
    expect(formatRainChance(55, 'en', true, 'full')).toBe('Moderate (55%)');
    expect(formatRainChance(75, 'en', true, 'full')).toBe('High (75%)');
    expect(formatRainChance(90, 'en', true, 'full')).toBe('Very High (90%)');
  });

  it('formatRainChance formats correctly in Myanmar', () => {
    expect(formatRainChance(10, 'mm', true, 'full')).toBe('အလွန်နည်း (10%)');
  });

  it('formatRainChance formats correctly in short format', () => {
    expect(formatRainChance(35, 'en', false, 'short')).toBe('Low');
    expect(formatRainChance(75, 'en', false, 'short')).toBe('High');
  });

  it('getRainChanceExplanation provides correct explanations', () => {
    expect(getRainChanceExplanation(10, 'en')).toBe('Rain is very unlikely');
    expect(getRainChanceExplanation(10, 'mm')).toBe('မိုးရွာနိုင်ခြေ အလွန်နည်းပါသည်');
    expect(getRainChanceExplanation(75, 'en')).toBe('Rain is likely');
  });

  it('getRainChanceColorClass returns correct color classes', () => {
    expect(getRainChanceColorClass(10, false)).toBe('green');
    expect(getRainChanceColorClass(10, true)).toBe('green');
    expect(getRainChanceColorClass(75, false)).toBe('red');
    expect(getRainChanceColorClass(75, true)).toBe('red');
  });

  it('getRainChanceIcon returns correct icons', () => {
    expect(getRainChanceIcon(10)).toBe('☀️');
    expect(getRainChanceIcon(35)).toBe('🌤️');
    expect(getRainChanceIcon(55)).toBe('⛅');
    expect(getRainChanceIcon(75)).toBe('🌦️');
    expect(getRainChanceIcon(90)).toBe('🌧️');
  });

  it('handles edge cases correctly', () => {
    expect(formatRainChance(null, 'en', true, 'full')).toBe('');
    expect(formatRainChance(undefined, 'en', true, 'full')).toBe('');
    expect(formatRainChance(NaN, 'en', true, 'full')).toBe('');
    expect(formatRainChance(0, 'en', true, 'full')).toBe('Very Low (0%)');
    expect(formatRainChance(100, 'en', true, 'full')).toBe('Very High (100%)');
  });
});

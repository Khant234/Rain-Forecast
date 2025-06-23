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

// Mock console.log to capture output for testing
const consoleLogMock = jest.spyOn(console, 'log').mockImplementation(() => {});

describe('rainChanceFormatter', () => {
  afterEach(() => {
    consoleLogMock.mockClear(); // Clear mock calls after each test
  });

  it('formatRainChance function with full format and English locale', () => {
    expect(formatRainChance(10, 'en', true, 'full')).toBe('Very Low (10%)');
    expect(formatRainChance(35, 'en', true, 'full')).toBe('Low (35%)');
    expect(formatRainChance(55, 'en', true, 'full')).toBe('Moderate (55%)');
    expect(formatRainChance(75, 'en', true, 'full')).toBe('High (75%)');
    expect(formatRainChance(90, 'en', true, 'full')).toBe('Very High (90%)');
  });

  it('formatRainChance function with full format and Myanmar locale', () => {
    expect(formatRainChance(10, 'mm', true, 'full')).toBe('အလွန်နည်း (10%)');
  });

  it('formatRainChance function with short format', () => {
    expect(formatRainChance(35, 'en', false, 'short')).toBe('Low');
    expect(formatRainChance(75, 'en', false, 'short')).toBe('High');
  });

  it('getRainChanceExplanation function with English locale', () => {
    expect(getRainChanceExplanation(10, 'en')).toBe('Rain is very unlikely');
    expect(getRainChanceExplanation(75, 'en')).toBe('Rain is likely');
  });

  it('getRainChanceExplanation function with Myanmar locale', () => {
    expect(getRainChanceExplanation(10, 'mm')).toBe('မိုးရွာနိုင်ခြေ အလွန်နည်းပါသည်');
  });

  it('getRainChanceColorClass function in light mode', () => {
    expect(getRainChanceColorClass(10, false)).toBe('green');
    expect(getRainChanceColorClass(75, false)).toBe('red');
  });

  it('getRainChanceColorClass function in dark mode', () => {
    expect(getRainChanceColorClass(10, true)).toBe('green');
    expect(getRainChanceColorClass(75, true)).toBe('red');
  });

  it('getRainChanceIcon function', () => {
    expect(getRainChanceIcon(10)).toBe('☀️');
    expect(getRainChanceIcon(35)).toBe('🌤️');
    expect(getRainChanceIcon(55)).toBe('⛅');
    expect(getRainChanceIcon(75)).toBe('🌦️');
    expect(getRainChanceIcon(90)).toBe('🌧️');
  });

  it('formatRainChance handles edge cases', () => {
    expect(formatRainChance(null, 'en', true, 'full')).toBe('');
    expect(formatRainChance(undefined, 'en', true, 'full')).toBe('');
    expect(formatRainChance(NaN, 'en', true, 'full')).toBe('');
    expect(formatRainChance(0, 'en', true, 'full')).toBe('Very Low (0%)');
    expect(formatRainChance(100, 'en', true, 'full')).toBe('Very High (100%)');
  });

  // Restore console.log after all tests
  afterAll(() => {
    consoleLogMock.mockRestore();
  });
});
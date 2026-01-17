import { describe, expect, it } from 'vitest';
import { formatDuration, formatViewCount } from './formatters';

describe('formatDuration', () => {
  it('formats null as zero', () => {
    expect(formatDuration(null)).toBe('0:00');
  });

  it('formats seconds into minutes and seconds', () => {
    expect(formatDuration(65)).toBe('1:05');
  });
});

describe('formatViewCount', () => {
  it('formats thousands', () => {
    expect(formatViewCount(1500)).toBe('1.5K');
  });

  it('formats millions', () => {
    expect(formatViewCount(2000000)).toBe('2.0M');
  });

  it('formats small numbers', () => {
    expect(formatViewCount(999)).toBe('999');
  });
});

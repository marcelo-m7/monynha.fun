import { describe, expect, it } from 'vitest';
import { formatDuration, formatViewCount } from './format';

describe('format helpers', () => {
  it('formats durations', () => {
    expect(formatDuration(null)).toBe('0:00');
    expect(formatDuration(undefined)).toBe('0:00');
    expect(formatDuration(-10)).toBe('0:00');
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(59)).toBe('0:59');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(600)).toBe('10:00');
    expect(formatDuration(3903)).toBe('1:05:03');
    expect(formatDuration(7503)).toBe('2:05:03');
  });

  it('formats view counts', () => {
    expect(formatViewCount(12)).toBe('12');
    expect(formatViewCount(1200)).toBe('1.2K');
    expect(formatViewCount(1200000)).toBe('1.2M');
  });
});

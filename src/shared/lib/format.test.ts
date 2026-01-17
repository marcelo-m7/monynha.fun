import { describe, expect, it } from 'vitest';
import { formatDuration, formatViewCount } from './format';

describe('format helpers', () => {
  it('formats durations', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(600)).toBe('10:00');
  });

  it('formats view counts', () => {
    expect(formatViewCount(12)).toBe('12');
    expect(formatViewCount(1200)).toBe('1.2K');
    expect(formatViewCount(1200000)).toBe('1.2M');
  });
});

import { describe, expect, it } from 'vitest';
import {
  extractDurationSecondsFromYoutubeHtml,
  parseIso8601DurationToSeconds,
} from './backfill-video-durations.mjs';

describe('backfill-video-durations parser', () => {
  it('parses ISO 8601 durations', () => {
    expect(parseIso8601DurationToSeconds('PT45S')).toBe(45);
    expect(parseIso8601DurationToSeconds('PT2M05S')).toBe(125);
    expect(parseIso8601DurationToSeconds('PT1H02M03S')).toBe(3723);
  });

  it('extracts lengthSeconds from public YouTube HTML', () => {
    expect(extractDurationSecondsFromYoutubeHtml('{"videoDetails":{"lengthSeconds":"251"}}')).toBe(251);
  });

  it('falls back to public duration metadata', () => {
    expect(extractDurationSecondsFromYoutubeHtml('<meta itemprop="duration" content="PT3M12S">')).toBe(192);
  });

  it('returns null when no duration is present', () => {
    expect(extractDurationSecondsFromYoutubeHtml('<html><title>Video</title></html>')).toBeNull();
  });
});

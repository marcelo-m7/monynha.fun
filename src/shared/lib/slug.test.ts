import { describe, expect, it } from 'vitest';
import { generateSlug } from './slug';

describe('generateSlug', () => {
  it('normalizes video titles into lowercase slugs', () => {
    expect(generateSlug('Educação & IA: Aula #1!')).toBe('educacao-ia-aula-1');
  });

  it('removes accents, emojis, punctuation, duplicate spaces and extra hyphens', () => {
    expect(generateSlug('  Olá, mundo!!! 🤖 -- Parte  2  ')).toBe('ola-mundo-parte-2');
  });

  it('uses a stable fallback when the title has no slug-safe characters', () => {
    expect(generateSlug('*** 🤖 ***')).toBe('video');
  });

  it('normalizes optional suffixes', () => {
    expect(generateSlug('Aula', 'Número 2')).toBe('aula-numero-2');
  });
});

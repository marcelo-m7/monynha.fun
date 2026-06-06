import { describe, expect, it } from 'vitest';
import {
  buildVideoSummary,
  deriveTags,
  normalizeLanguage,
  pickCategory,
  type LegacyFastCategory,
} from '../../../supabase/functions/_shared/legacy-fast-enrichment';

const categories: LegacyFastCategory[] = [
  { id: 'cat-cultura', name: 'Cultura', slug: 'cultura' },
  { id: 'cat-design', name: 'Design', slug: 'design' },
  { id: 'cat-educacao', name: 'Educacao', slug: 'educacao' },
  { id: 'cat-unclassified', name: 'Nao Classificados', slug: 'nao-classificados' },
  { id: 'cat-tech', name: 'Tecnologia', slug: 'tech' },
  { id: 'cat-tutorials', name: 'Tutoriais', slug: 'tutoriais-antigos' },
];

describe('legacy fast enrichment helpers', () => {
  it('builds a useful summary when YouTube oEmbed has no description', () => {
    expect(
      buildVideoSummary({
        title: 'SQL Tutorial - Full Database Course for Beginners',
        description: '',
        channelName: 'freeCodeCamp.org',
        youtubeId: 'HXV3zeQKqGY',
      }),
    ).toBe('Video do canal freeCodeCamp.org sobre "SQL Tutorial - Full Database Course for Beginners", enviado para curadoria Tube O2.');
  });

  it('preserves an explicit non-unclassified category', () => {
    const selected = pickCategory(categories, {
      currentCategoryId: 'cat-cultura',
      title: 'SQL database tutorial',
      description: null,
      channelName: 'freeCodeCamp.org',
      semanticTags: ['dados', 'educacao'],
    });

    expect(selected?.id).toBe('cat-cultura');
  });

  it('selects a category automatically when the video is uncategorized', () => {
    const language = normalizeLanguage('en');
    const semanticTags = deriveTags({
      title: 'SQL Tutorial - Full Database Course for Beginners',
      description: null,
      channelName: 'freeCodeCamp.org',
      language,
    });

    const selected = pickCategory(categories, {
      currentCategoryId: null,
      title: 'SQL Tutorial - Full Database Course for Beginners',
      description: null,
      channelName: 'freeCodeCamp.org',
      semanticTags,
    });

    expect(semanticTags).toEqual(expect.arrayContaining(['banco de dados', 'educação']));
    expect(selected?.id).toBe('cat-educacao');
  });

  it('detects art history videos from movement and painting terms', () => {
    const semanticTags = deriveTags({
      title: 'A Pintura do Renascimento',
      description: null,
      channelName: 'Dani Porto',
      language: 'pt',
    });

    const selected = pickCategory(categories, {
      currentCategoryId: null,
      title: 'A Pintura do Renascimento',
      description: null,
      channelName: 'Dani Porto',
      semanticTags,
    });

    expect(semanticTags).toContain('história da arte');
    expect(selected?.id).toBe('cat-design');
  });

  it('falls back to education instead of leaving the category empty', () => {
    const selected = pickCategory(categories, {
      currentCategoryId: 'cat-unclassified',
      title: 'A quiet video without strong keyword signals',
      description: null,
      channelName: null,
      semanticTags: ['youtube', 'curadoria', 'pt'],
    });

    expect(selected?.id).toBe('cat-educacao');
  });
});

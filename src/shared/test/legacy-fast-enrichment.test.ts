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
  { id: 'cat-matematica', name: 'Matematica', slug: 'matematica' },
  { id: 'cat-musica', name: 'Musica', slug: 'musica' },
  { id: 'cat-receitas', name: 'Receitas', slug: 'receitas-tradicionais' },
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
    expect(selected?.id).toBe('cat-tech');
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

  it('detects recipe signals and routes culinary videos to receitas category', () => {
    const semanticTags = deriveTags({
      title: 'A Verdadeira Sopa de Cebola Francesa',
      description: 'Segredos da Paola para um sabor intenso.',
      channelName: 'Cozinha da Paola',
      language: 'pt',
    });

    const selected = pickCategory(categories, {
      currentCategoryId: 'cat-educacao',
      title: 'A Verdadeira Sopa de Cebola Francesa',
      description: 'Segredos da Paola para um sabor intenso.',
      channelName: 'Cozinha da Paola',
      semanticTags,
    });

    expect(semanticTags).toContain('receitas');
    expect(selected?.id).toBe('cat-receitas');
  });

  it('detects music signals and routes music videos to musica category', () => {
    const semanticTags = deriveTags({
      title: 'Michael Jackson - Billie Jean (Official Video)',
      description: 'Official music video from the Thriller album.',
      channelName: 'michaeljacksonVEVO',
      language: 'en',
    });

    const selected = pickCategory(categories, {
      currentCategoryId: 'cat-educacao',
      title: 'Michael Jackson - Billie Jean (Official Video)',
      description: 'Official music video from the Thriller album.',
      channelName: 'michaeljacksonVEVO',
      semanticTags,
    });

    expect(semanticTags).toContain('música');
    expect(selected?.id).toBe('cat-musica');
  });

  it('does not classify general software videos with hyphenated titles as musica', () => {
    const semanticTags = deriveTags({
      title: 'React Hooks - Guia Completo para Iniciantes',
      description: 'Aprenda estado e efeitos no React de forma pratica.',
      channelName: 'Dev Aula',
      language: 'pt',
    });

    const selected = pickCategory(categories, {
      currentCategoryId: 'cat-educacao',
      title: 'React Hooks - Guia Completo para Iniciantes',
      description: 'Aprenda estado e efeitos no React de forma pratica.',
      channelName: 'Dev Aula',
      semanticTags,
    });

    expect(selected?.id).not.toBe('cat-musica');
    expect(selected?.id).toBe('cat-tech');
  });

  it('accepts musica semantic tag without accent and still routes to musica category', () => {
    const selected = pickCategory(categories, {
      currentCategoryId: 'cat-educacao',
      title: 'Jam Session ao vivo',
      description: 'Improviso musical com banda independente.',
      channelName: 'Canal de Musica',
      semanticTags: ['musica', 'live'],
    });

    expect(selected?.id).toBe('cat-musica');
  });

  it('routes Paola Carosella culinary classes to receitas category', () => {
    const semanticTags = deriveTags({
      title: 'Uma aula sobre Mandioca com Thiago Castanho!',
      description: 'Tecnicas de cozinha e preparo de ingredientes.',
      channelName: 'Paola Carosella',
      language: 'pt',
    });

    const selected = pickCategory(categories, {
      currentCategoryId: 'cat-educacao',
      title: 'Uma aula sobre Mandioca com Thiago Castanho!',
      description: 'Tecnicas de cozinha e preparo de ingredientes.',
      channelName: 'Paola Carosella',
      semanticTags,
    });

    expect(semanticTags).toContain('receitas');
    expect(selected?.id).toBe('cat-receitas');
  });

  it('routes strong software infrastructure content to tech category', () => {
    const semanticTags = deriveTags({
      title: 'Install Coolify on Linux • 2025',
      description: 'Deploy apps and configure cloud servers.',
      channelName: 'Airoflare',
      language: 'en',
    });

    const selected = pickCategory(categories, {
      currentCategoryId: 'cat-educacao',
      title: 'Install Coolify on Linux • 2025',
      description: 'Deploy apps and configure cloud servers.',
      channelName: 'Airoflare',
      semanticTags,
    });

    expect(selected?.id).toBe('cat-tech');
  });

  it('routes strong calculus content to matematica category', () => {
    const semanticTags = deriveTags({
      title: 'METODO DOS MULTIPLICADORES DE LAGRANGE - AULA 3',
      description: 'Problemas de calculo com restricoes.',
      channelName: 'Prof. Matematica',
      language: 'pt',
    });

    const selected = pickCategory(categories, {
      currentCategoryId: 'cat-educacao',
      title: 'METODO DOS MULTIPLICADORES DE LAGRANGE - AULA 3',
      description: 'Problemas de calculo com restricoes.',
      channelName: 'Prof. Matematica',
      semanticTags,
    });

    expect(selected?.id).toBe('cat-matematica');
  });
});

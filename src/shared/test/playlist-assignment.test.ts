import { describe, expect, it } from 'vitest';
import {
  assignPlaylist,
  type PlaylistAssignmentEnrichment,
  type PlaylistAssignmentPlaylist,
} from '../../../supabase/functions/_shared/playlist-assignment';

const playlists: PlaylistAssignmentPlaylist[] = [
  {
    id: 'educacao',
    name: 'Educacao',
    slug: 'educacao',
    description: 'Colecao geral para videos educacionais submetidos pela comunidade antes da classificacao curricular por IA.',
    language: 'pt',
    is_public: true,
    is_ordered: false,
    course_code: null,
    unit_code: null,
  } as PlaylistAssignmentPlaylist,
  {
    id: 'math-ii',
    name: 'Analise Matematica II - 1º Ano 2º Semestre - LESTI',
    description: 'Roteiro oficial de aprendizagem da unidade curricular 19411008 da licenciatura em Engenharia de Sistemas e Tecnologias da Informacao (LESTI), organizado por semestre.',
    language: 'pt',
    is_public: true,
    is_ordered: true,
    course_code: 'LESTI',
    unit_code: '19411008',
  },
  {
    id: 'design-i',
    name: 'Design de Comunicacao I - 1º Ano 1º Semestre - LDC',
    description: 'Roteiro oficial de aprendizagem da unidade curricular 14541000 da licenciatura em Design de Comunicacao (LDC), organizado por semestre.',
    language: 'pt',
    is_public: true,
    is_ordered: true,
    course_code: 'LDC',
    unit_code: '14541000',
  },
  {
    id: 'programming',
    name: 'Programacao I - 1º Ano 1º Semestre - LESTI',
    description: 'Fundamentos de programacao, algoritmos e codigo.',
    language: 'pt',
    is_public: true,
    is_ordered: true,
    course_code: 'LESTI',
    unit_code: '19411001',
  },
];

const baseEnrichment: PlaylistAssignmentEnrichment = {
  semantic_tags: ['educacao'],
  suggested_category: 'educacao',
  suggested_playlist_id: null,
  suggested_playlist_query: null,
  classification_confidence: 0.70,
  language: 'pt',
};

describe('playlist assignment', () => {
  it('assigns Integral de Linha videos to Analise Matematica II', () => {
    const result = assignPlaylist({
      playlists,
      enrichment: {
        ...baseEnrichment,
        semantic_tags: ['integral', 'calculo', 'matematica'],
        suggested_playlist_query: 'integral de linha matematica',
      },
      video: {
        title: 'INTEGRAL DE LINHA #01',
        description: null,
        channelName: 'Prof. MURAKAMI - MATEMATICA RAPIDOLA',
        language: 'pt',
      },
    });

    expect(result.assignedPlaylistId).toBe('math-ii');
    expect(result.reliability).toBe('high');
    expect(result.topCandidates[0].playlistId).toBe('math-ii');
  });

  it('rejects an AI design suggestion when original metadata strongly indicates math', () => {
    const result = assignPlaylist({
      playlists,
      enrichment: {
        ...baseEnrichment,
        semantic_tags: ['design', 'comunicacao', 'visual'],
        suggested_category: 'design',
        suggested_playlist_id: 'design-i',
        suggested_playlist_query: 'design comunicacao visual',
      },
      video: {
        title: 'INTEGRAL DE LINHA #02',
        description: null,
        channelName: 'Prof. MURAKAMI - MATEMATICA RAPIDOLA',
        language: 'pt',
      },
    });

    expect(result.rejectedAiPlaylistId).toBe('design-i');
    expect(result.assignedPlaylistId).toBe('math-ii');
    expect(result.reason).toContain('rejected');
  });

  it('keeps clear design videos eligible for LDC playlists', () => {
    const result = assignPlaylist({
      playlists,
      enrichment: {
        ...baseEnrichment,
        semantic_tags: ['design', 'comunicacao', 'tipografia'],
        suggested_playlist_id: 'design-i',
        suggested_playlist_query: 'design comunicacao tipografia',
      },
      video: {
        title: 'Fundamentos de Design de Comunicacao',
        description: 'Aula de comunicacao visual e grafismo.',
        channelName: 'LDC Studio',
        language: 'pt',
      },
    });

    expect(result.assignedPlaylistId).toBe('design-i');
    expect(result.rejectedAiPlaylistId).toBeNull();
  });

  it('falls back to enrichment scoring when no strong source signal exists', () => {
    const result = assignPlaylist({
      playlists,
      enrichment: {
        ...baseEnrichment,
        semantic_tags: ['algoritmo', 'codigo'],
        suggested_playlist_query: 'programacao algoritmos codigo',
      },
      video: {
        title: 'Aula 1',
        description: null,
        channelName: 'Canal de estudos',
        language: 'pt',
      },
    });

    expect(result.assignedPlaylistId).toBe('programming');
  });

  it('does not let the general education playlist beat a strong curricular match', () => {
    const result = assignPlaylist({
      playlists,
      enrichment: {
        ...baseEnrichment,
        semantic_tags: ['educacao', 'integracao', 'calculo'],
        suggested_playlist_query: 'educacao matematica integracao',
      },
      video: {
        title: 'Integracao por partes passo a passo',
        description: null,
        channelName: 'Prof. MURAKAMI - MATEMATICA RAPIDOLA',
        language: 'pt',
      },
    });

    expect(result.assignedPlaylistId).toBe('math-ii');
    expect(result.topCandidates.find((candidate) => candidate.playlistId === 'educacao')?.score).toBeLessThan(
      result.topCandidates[0].score,
    );
  });
});

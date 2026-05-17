import { describe, expect, it } from 'vitest';
import {
  assignPlaylist,
  type PlaylistAssignmentAnalysis,
  type PlaylistAssignmentPlaylist,
} from '../../../supabase/functions/_shared/playlist-assignment';

const playlists: PlaylistAssignmentPlaylist[] = [
  {
    id: 'educacao',
    name: 'Educacao',
    description: 'Colecao geral para videos educacionais submetidos pela comunidade.',
    language: 'pt',
    is_public: true,
    is_ordered: false,
    course_code: null,
    unit_code: null,
  },
  {
    id: 'math-ii',
    name: 'Analise Matematica II - 1º Ano 2º Semestre - LESTI',
    description: 'Roteiro oficial de aprendizagem da unidade curricular 19411008 da licenciatura em Engenharia de Sistemas e Tecnologias da Informacao.',
    language: 'pt',
    is_public: true,
    is_ordered: true,
    course_code: 'LESTI',
    unit_code: '19411008',
  },
  {
    id: 'design-i',
    name: 'Design de Comunicacao I - 1º Ano 1º Semestre - LDC',
    description: 'Roteiro oficial de aprendizagem da unidade curricular 14541000 da licenciatura em Design de Comunicacao.',
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

const baseAnalysis: PlaylistAssignmentAnalysis = {
  semanticTags: ['educacao'],
  summaryDescription: 'Aula introdutoria com conteudo educacional.',
  shortSummary: 'Aula introdutoria.',
  language: 'pt',
  geminiAssignedPlaylistId: null,
  geminiConfidence: null,
  geminiReason: null,
};

describe('playlist assignment', () => {
  it('assigns Integral de Linha videos to Analise Matematica II when Gemini and local signals agree', () => {
    const result = assignPlaylist({
      playlists,
      analysis: {
        ...baseAnalysis,
        semanticTags: ['integral de linha', 'calculo', 'matematica'],
        summaryDescription: 'Aula sobre integrais de linha, calculo vetorial e aplicacoes em matematica.',
        shortSummary: 'Integral de linha em calculo vetorial.',
        geminiAssignedPlaylistId: 'math-ii',
        geminiConfidence: 0.88,
        geminiReason: 'O conteudo trata de calculo e analise matematica.',
      },
    });

    expect(result.assignedPlaylistId).toBe('math-ii');
    expect(result.reliability).toBe('high');
    expect(result.topCandidates[0].playlistId).toBe('math-ii');
  });

  it('rejects a Gemini design suggestion when processed analysis strongly indicates math', () => {
    const result = assignPlaylist({
      playlists,
      analysis: {
        ...baseAnalysis,
        semanticTags: ['integral de linha', 'calculo', 'matematica'],
        summaryDescription: 'Aula de calculo sobre integrais e coordenadas.',
        shortSummary: 'Exercicios de calculo integral.',
        geminiAssignedPlaylistId: 'design-i',
        geminiConfidence: 0.92,
        geminiReason: 'Sugestao incorreta para design.',
      },
    });

    expect(result.assignedPlaylistId).toBeNull();
    expect(result.rejectedPlaylistId).toBe('design-i');
    expect(result.reason).toContain('rejected');
  });

  it('keeps clear design videos eligible for LDC playlists', () => {
    const result = assignPlaylist({
      playlists,
      analysis: {
        ...baseAnalysis,
        semanticTags: ['design de comunicacao', 'tipografia', 'comunicacao visual'],
        summaryDescription: 'Aula de design de comunicacao sobre tipografia e composicao visual.',
        shortSummary: 'Fundamentos de design de comunicacao.',
        geminiAssignedPlaylistId: 'design-i',
        geminiConfidence: 0.83,
      },
    });

    expect(result.assignedPlaylistId).toBe('design-i');
    expect(result.rejectedPlaylistId).toBeNull();
  });

  it('returns null when Gemini does not choose a playlist even if broad tokens exist', () => {
    const result = assignPlaylist({
      playlists,
      analysis: {
        ...baseAnalysis,
        semanticTags: ['aula', 'educacao', 'estudo'],
        summaryDescription: 'Video de estudo com conteudo generico sem unidade curricular clara.',
        shortSummary: 'Conteudo educacional generico.',
        geminiAssignedPlaylistId: null,
        geminiConfidence: 0.25,
      },
    });

    expect(result.assignedPlaylistId).toBeNull();
  });

  it('does not let the general education playlist beat a strong curricular match', () => {
    const result = assignPlaylist({
      playlists,
      analysis: {
        ...baseAnalysis,
        semanticTags: ['integracao', 'calculo', 'matematica'],
        summaryDescription: 'Aula de matematica sobre integracao por partes e calculo integral.',
        shortSummary: 'Integracao por partes passo a passo.',
        geminiAssignedPlaylistId: 'math-ii',
        geminiConfidence: 0.9,
      },
    });

    expect(result.assignedPlaylistId).toBe('math-ii');
    expect(result.topCandidates.find((candidate) => candidate.playlistId === 'educacao')?.score).toBeLessThan(
      result.topCandidates[0].score,
    );
  });
});

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

type PlaylistAssignmentAnalysis = {
  title: string;
  description: string;
  semanticTags: string[];
  summaryDescription: string;
  shortSummary: string;
  language: string | null;
  suggestedPlaylistId: string | null;
  suggestedPlaylistQuery: string | null;
  classificationConfidence: number | null;
};

type PlaylistAssignmentPlaylist = {
  id: string;
  name: string;
  description: string;
  language: string | null;
  is_public: boolean;
  is_ordered: boolean;
  course_code: string | null;
  unit_code: string | null;
};

const playlistAssignmentPath = path.join(process.cwd(), 'supabase/functions/_shared/playlist-assignment.ts');
const playlistAssignmentModuleUrl = pathToFileURL(playlistAssignmentPath).href;
const describeIfPlaylistAssignmentExists = fs.existsSync(playlistAssignmentPath) ? describe : describe.skip;

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
    id: 'math-i',
    name: 'Analise Matematica I - 1º Ano 1º Semestre - LESTI',
    description: 'Limites, derivadas, funcoes e fundamentos de calculo diferencial.',
    language: 'pt',
    is_public: true,
    is_ordered: true,
    course_code: 'LESTI',
    unit_code: '19411007',
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
    id: 'art-history',
    name: 'Historia da Arte Moderna e Contemporanea - 1º Ano 1º Semestre - LDC',
    description: 'Roteiro oficial de aprendizagem da unidade curricular 14541196 da licenciatura em Design de Comunicacao.',
    language: 'pt',
    is_public: true,
    is_ordered: true,
    course_code: 'LDC',
    unit_code: '14541196',
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
  {
    id: 'database-i',
    name: 'Base de Dados I - 2º Ano 1º Semestre - LESTI',
    description: 'Modelacao, SQL, consultas, tabelas, procedures e fundamentos de sistemas de bases de dados.',
    language: 'pt',
    is_public: true,
    is_ordered: true,
    course_code: 'LESTI',
    unit_code: '19411010',
  },
  {
    id: 'receitas-tradicionais',
    name: 'Receitas Tradicionais Portuguesas',
    description: 'Sopas, pratos e tecnicas de cozinha tradicional.',
    language: 'pt',
    is_public: true,
    is_ordered: false,
    course_code: null,
    unit_code: null,
  },
];

const baseAnalysis: PlaylistAssignmentAnalysis = {
  title: 'Aula introdutoria',
  description: 'Conteudo educacional.',
  semanticTags: ['educacao'],
  summaryDescription: 'Aula introdutoria com conteudo educacional.',
  shortSummary: 'Aula introdutoria.',
  language: 'pt',
  suggestedPlaylistId: null,
  suggestedPlaylistQuery: null,
  classificationConfidence: null,
};

describeIfPlaylistAssignmentExists('playlist assignment', () => {
  it('accepts an OpenAI playlist suggestion when local signals agree', async () => {
    const { assignPlaylist } = await import(/* @vite-ignore */ playlistAssignmentModuleUrl);

    const result = assignPlaylist({
      playlists,
      analysis: {
        ...baseAnalysis,
        title: 'Integral de linha em calculo vetorial',
        semanticTags: ['integral de linha', 'calculo', 'matematica'],
        summaryDescription: 'Aula sobre integrais de linha, calculo vetorial e aplicacoes em matematica.',
        shortSummary: 'Integral de linha em calculo vetorial.',
        suggestedPlaylistId: 'math-ii',
        suggestedPlaylistQuery: 'integral de linha calculo vetorial',
        classificationConfidence: 0.88,
      },
    });

    expect(result.assignedPlaylistId).toMatch(/^math-/);
    expect(result.reliability).toBe('high');
    expect(result.decisionSource).toBe('openai');
    expect(result.topCandidates[0].playlistId).toBe('math-ii');
  });

  it('rejects an OpenAI design suggestion when processed analysis strongly indicates math', async () => {
    const { assignPlaylist } = await import(/* @vite-ignore */ playlistAssignmentModuleUrl);

    const result = assignPlaylist({
      playlists,
      analysis: {
        ...baseAnalysis,
        title: 'Integral de linha em calculo vetorial',
        semanticTags: ['integral de linha', 'calculo', 'matematica'],
        summaryDescription: 'Aula de calculo sobre integrais e coordenadas.',
        shortSummary: 'Exercicios de calculo integral.',
        suggestedPlaylistId: 'design-i',
        suggestedPlaylistQuery: 'design de comunicacao',
        classificationConfidence: 0.92,
      },
    });

    expect(result.assignedPlaylistId).toBeNull();
    expect(result.rejectedPlaylistId).toBe('design-i');
    expect(result.reason).toContain('rejected');
  });

  it('keeps clear design videos eligible for LDC playlists', async () => {
    const { assignPlaylist } = await import(/* @vite-ignore */ playlistAssignmentModuleUrl);

    const result = assignPlaylist({
      playlists,
      analysis: {
        ...baseAnalysis,
        title: 'Tipografia em design de comunicacao',
        semanticTags: ['design de comunicacao', 'tipografia', 'comunicacao visual'],
        summaryDescription: 'Aula de design de comunicacao sobre tipografia e composicao visual.',
        shortSummary: 'Fundamentos de design de comunicacao.',
        suggestedPlaylistId: 'design-i',
        suggestedPlaylistQuery: 'tipografia comunicacao visual',
        classificationConfidence: 0.83,
      },
    });

    expect(result.assignedPlaylistId).toBe('design-i');
    expect(result.rejectedPlaylistId).toBeNull();
  });

  it('assigns art history imports to the LDC art history playlist', async () => {
    const { assignPlaylist } = await import(/* @vite-ignore */ playlistAssignmentModuleUrl);

    const result = assignPlaylist({
      playlists,
      analysis: {
        ...baseAnalysis,
        title: 'A Pintura do Renascimento',
        semanticTags: ['história da arte'],
        summaryDescription: 'Video do canal Dani Porto sobre A Pintura do Renascimento.',
        shortSummary: 'A Pintura do Renascimento.',
        suggestedPlaylistId: null,
        suggestedPlaylistQuery: 'história da arte',
        classificationConfidence: null,
      },
    });

    expect(result.assignedPlaylistId).toBe('art-history');
    expect(result.decisionSource).toBe('deterministic');
    expect(result.reliability).toBe('high');
  });

  it('returns null when OpenAI does not choose a playlist and signals are broad', async () => {
    const { assignPlaylist } = await import(/* @vite-ignore */ playlistAssignmentModuleUrl);

    const result = assignPlaylist({
      playlists,
      analysis: {
        ...baseAnalysis,
        semanticTags: ['aula', 'educacao', 'estudo'],
        summaryDescription: 'Video de estudo com conteudo generico sem unidade curricular clara.',
        shortSummary: 'Conteudo educacional generico.',
        suggestedPlaylistId: null,
        suggestedPlaylistQuery: 'conteudo educacional generico',
        classificationConfidence: 0.25,
      },
    });

    expect(result.assignedPlaylistId).toBeNull();
  });

  it('uses deterministic assignment only for a strong curricular match', async () => {
    const { assignPlaylist } = await import(/* @vite-ignore */ playlistAssignmentModuleUrl);

    const result = assignPlaylist({
      playlists,
      analysis: {
        ...baseAnalysis,
        title: 'Integracao por partes em analise matematica',
        semanticTags: ['integracao', 'calculo', 'matematica'],
        summaryDescription: 'Aula de matematica sobre integracao por partes e calculo integral.',
        shortSummary: 'Integracao por partes passo a passo.',
        suggestedPlaylistId: null,
        suggestedPlaylistQuery: 'calculo integral analise matematica',
        classificationConfidence: 0.9,
      },
    });

    expect(result.assignedPlaylistId).toMatch(/^math-/);
    expect(result.decisionSource).toBe('deterministic');
    expect(result.topCandidates[0].playlistId).toMatch(/^math-/);
  });

  it('rejects a low-confidence OpenAI playlist suggestion', async () => {
    const { assignPlaylist } = await import(/* @vite-ignore */ playlistAssignmentModuleUrl);

    const result = assignPlaylist({
      playlists,
      analysis: {
        ...baseAnalysis,
        title: 'Programacao introdutoria',
        semanticTags: ['programacao', 'algoritmo'],
        summaryDescription: 'Aula sobre fundamentos de programacao e algoritmos.',
        shortSummary: 'Fundamentos de programacao.',
        suggestedPlaylistId: 'programming',
        suggestedPlaylistQuery: 'programacao algoritmos',
        classificationConfidence: 0.42,
      },
    });

    expect(result.assignedPlaylistId).toBeNull();
    expect(result.rejectedPlaylistId).toBe('programming');
    expect(result.reason).toContain('confidence');
  });

  it('prioritizes database playlists for SQL Server lessons', () => {
    const result = assignPlaylist({
      playlists,
      analysis: {
        ...baseAnalysis,
        title: 'SQL SERVER - PROCEDURES - Como criar, executar e apagar',
        semanticTags: ['sql server', 'procedures', 'base de dados', 'consultas sql'],
        summaryDescription: 'Aula sobre criacao e execucao de procedures em SQL Server.',
        shortSummary: 'Procedures em SQL Server.',
        suggestedPlaylistId: null,
        suggestedPlaylistQuery: 'sql server base de dados',
        classificationConfidence: 0.9,
      },
    });

    expect(result.assignedPlaylistId).toBe('database-i');
    expect(result.decisionSource).toBe('deterministic');
    expect(result.topCandidates[0].playlistId).toBe('database-i');
  });

  it('assigns Calculo 1 derivative lessons to Analise Matematica I despite I/II score ties', () => {
    const result = assignPlaylist({
      playlists,
      analysis: {
        ...baseAnalysis,
        title: 'Derivada das Funcoes Hiperbolicas - Calculo 1',
        semanticTags: ['calculo 1', 'derivadas', 'funcoes'],
        summaryDescription: 'Aula de Calculo 1 sobre derivadas de funcoes hiperbolicas.',
        shortSummary: 'Derivadas em Calculo 1.',
        suggestedPlaylistId: null,
        suggestedPlaylistQuery: 'calculo 1 derivadas funcoes',
        classificationConfidence: 0.9,
      },
    });

    expect(result.assignedPlaylistId).toBe('math-i');
    expect(result.decisionSource).toBe('deterministic');
  });

  it('assigns broad Calculo 1 limit and equation exercises to Analise Matematica I', () => {
    const result = assignPlaylist({
      playlists,
      analysis: {
        ...baseAnalysis,
        title: 'Aprenda equacoes trigonometricas. 1 hora direto de exercicios',
        semanticTags: ['equacoes trigonometricas', 'calculo 1', 'matematica'],
        summaryDescription: 'Exercicios de equacoes trigonometricas e limites para estudantes de Calculo 1.',
        shortSummary: 'Exercicios de equacoes trigonometricas.',
        suggestedPlaylistId: null,
        suggestedPlaylistQuery: 'calculo 1 equacoes trigonometricas',
        classificationConfidence: 0.9,
      },
    });

    expect(result.assignedPlaylistId).toBe('math-i');
    expect(result.decisionSource).toBe('deterministic');
  });

  it('routes probability/combinatorics lessons to math playlists, never to art history', () => {
    const result = assignPlaylist({
      playlists,
      analysis: {
        ...baseAnalysis,
        title: 'Probabilidade Condicional - Parte 1',
        semanticTags: ['probabilidade', 'combinatoria', 'matematica'],
        summaryDescription: 'Aula de probabilidade e combinatoria com exercicios de Bayes e distribuicao binomial.',
        shortSummary: 'Probabilidade condicional e combinatoria.',
        suggestedPlaylistId: null,
        suggestedPlaylistQuery: 'probabilidade combinatoria',
        classificationConfidence: 0.88,
      },
    });

    expect(result.assignedPlaylistId).toMatch(/^math-/);
    expect(result.assignedPlaylistId).not.toBe('art-history');
    expect(result.decisionSource).toBe('deterministic');
  });

  it('assigns culinary videos to recipe playlists when cooking signals are strong', () => {
    const result = assignPlaylist({
      playlists,
      analysis: {
        ...baseAnalysis,
        title: 'A Verdadeira Sopa de Cebola Francesa',
        semanticTags: ['receitas', 'sopa', 'culinaria'],
        summaryDescription: 'Receita de sopa de cebola francesa com tecnicas de cozinha tradicional.',
        shortSummary: 'Sopa de cebola francesa.',
        suggestedPlaylistId: null,
        suggestedPlaylistQuery: 'receita sopa culinaria',
        classificationConfidence: 0.86,
      },
    });

    expect(result.assignedPlaylistId).toBe('receitas-tradicionais');
    expect(result.decisionSource).toBe('deterministic');
  });
});

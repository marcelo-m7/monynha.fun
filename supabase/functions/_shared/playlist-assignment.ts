export type SubjectSignal =
  | 'math'
  | 'design'
  | 'programming'
  | 'database'
  | 'business'
  | 'language'
  | 'science'
  | 'humanities';

export type PlaylistAssignmentPlaylist = {
  id: string;
  name: string;
  description: string | null;
  language: string;
  is_public: boolean;
  is_ordered: boolean;
  course_code: string | null;
  unit_code: string | null;
};

export type PlaylistAssignmentAnalysis = {
  title?: string | null;
  description?: string | null;
  semanticTags: string[];
  summaryDescription: string | null;
  shortSummary: string | null;
  language: string | null;
  suggestedPlaylistId?: string | null;
  suggestedPlaylistQuery?: string | null;
  classificationConfidence?: number | null;
};

export type PlaylistAssignmentTopCandidate = {
  playlistId: string;
  name: string;
  score: number;
  compatible: boolean;
  isAiSuggested: boolean;
};

export type PlaylistAssignmentResult = {
  algorithmVersion: string;
  assignedPlaylistId: string | null;
  score: number;
  reliability: 'high' | 'low';
  reason: string;
  topCandidates: PlaylistAssignmentTopCandidate[];
  rejectedPlaylistId: string | null;
  providerConfidence: number | null;
  decisionSource: 'deterministic' | 'openai' | 'none';
  signals: Record<SubjectSignal, number>;
};

export const PLAYLIST_ASSIGNMENT_ALGORITHM_VERSION = 'playlist-assignment-v5-openai-enrichment';
export const MIN_PLAYLIST_ASSIGNMENT_CONFIDENCE = 0.65;
export const MIN_PLAYLIST_ASSIGNMENT_SCORE = 7;
export const MIN_DETERMINISTIC_PLAYLIST_SCORE = 12;

const subjectKeywords: Record<SubjectSignal, string[]> = {
  math: [
    'matematica',
    'matematico',
    'calculo',
    'analise',
    'integral',
    'integrais',
    'integracao',
    'derivada',
    'limite',
    'equacao',
    'algebra',
    'matriz',
    'vetor',
    'linha',
    'coordenadas',
    'polares',
    'probabilidade',
    'estatistica',
  ],
  design: [
    'design',
    'comunicacao',
    'grafico',
    'grafica',
    'visual',
    'tipografia',
    'ilustracao',
    'multimedia',
    'interacao',
    'marketing',
    'caligrafia',
  ],
  programming: [
    'programacao',
    'programming',
    'javascript',
    'typescript',
    'python',
    'java',
    'react',
    'node',
    'codigo',
    'algoritmo',
    'software',
    'linux',
    'windows',
    'ciberseguranca',
    'seguranca',
  ],
  database: [
    'sql',
    'sql server',
    't-sql',
    'database',
    'banco',
    'banco de dados',
    'base de dados',
    'dados',
    'tabela',
    'tabelas',
    'consulta',
    'consultas',
    'query',
    'queries',
    'procedure',
    'procedures',
    'trigger',
    'triggers',
    'view',
    'views',
    'stored procedure',
    'sequencia',
    'sequence',
  ],
  business: [
    'negocio',
    'business',
    'marketing',
    'empreendedorismo',
    'gestao',
    'vendas',
    'financeiro',
    'produto',
  ],
  language: [
    'ingles',
    'portugues',
    'espanhol',
    'frances',
    'lingua',
    'idioma',
    'grammar',
    'vocabulary',
  ],
  science: [
    'fisica',
    'quimica',
    'biologia',
    'ciencia',
    'laboratorio',
    'energia',
    'molecula',
  ],
  humanities: [
    'historia',
    'filosofia',
    'sociologia',
    'literatura',
    'cultura',
    'arte',
  ],
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function tokenize(value: string | null | undefined): string[] {
  return normalizeText(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

function tokenOverlapScore(left: string | null | undefined, right: string | null | undefined): number {
  const leftTokens = new Set(tokenize(left));
  if (leftTokens.size === 0) return 0;

  let score = 0;
  for (const token of tokenize(right)) {
    if (leftTokens.has(token)) {
      score += 1;
    }
  }

  return score;
}

function subjectSignalScore(text: string, subject: SubjectSignal): number {
  const normalized = normalizeText(text);
  return subjectKeywords[subject].reduce(
    (score, keyword) => score + (normalized.includes(keyword) ? 1 : 0),
    0,
  );
}

function getSubjectSignals(sourceText: string): Record<SubjectSignal, number> {
  return {
    math: subjectSignalScore(sourceText, 'math'),
    design: subjectSignalScore(sourceText, 'design'),
    programming: subjectSignalScore(sourceText, 'programming'),
    database: subjectSignalScore(sourceText, 'database'),
    business: subjectSignalScore(sourceText, 'business'),
    language: subjectSignalScore(sourceText, 'language'),
    science: subjectSignalScore(sourceText, 'science'),
    humanities: subjectSignalScore(sourceText, 'humanities'),
  };
}

function playlistText(playlist: PlaylistAssignmentPlaylist): string {
  return [
    playlist.name,
    playlist.description ?? '',
    playlist.course_code ?? '',
    playlist.unit_code ?? '',
  ].join(' ');
}

function analysisText(analysis: PlaylistAssignmentAnalysis): string {
  return [
    analysis.title ?? '',
    analysis.description ?? '',
    analysis.suggestedPlaylistQuery ?? '',
    analysis.semanticTags.join(' '),
    analysis.summaryDescription ?? '',
    analysis.shortSummary ?? '',
  ].join(' ');
}

function isGeneralEducationPlaylist(playlist: PlaylistAssignmentPlaylist): boolean {
  const text = normalizeText(`${playlist.name} ${playlist.description ?? ''}`);
  return !playlist.course_code && !playlist.unit_code && (
    text.includes('educacao') ||
    text.includes('education')
  );
}

function isDatabasePlaylist(playlist: PlaylistAssignmentPlaylist): boolean {
  const text = normalizeText(playlistText(playlist));
  return text.includes('base de dados') || text.includes('sql') || text.includes('database');
}

function playlistSubjectScore(playlist: PlaylistAssignmentPlaylist, subject: SubjectSignal): number {
  return subjectSignalScore(playlistText(playlist), subject);
}

function hasStrongSubjectConflict(
  playlist: PlaylistAssignmentPlaylist,
  signals: Record<SubjectSignal, number>,
): boolean {
  const strongestSubject = (Object.entries(signals) as Array<[SubjectSignal, number]>)
    .sort((left, right) => right[1] - left[1])[0];

  if (!strongestSubject || strongestSubject[1] < 2) {
    return false;
  }

  return playlistSubjectScore(playlist, strongestSubject[0]) === 0;
}

function scorePlaylist(params: {
  playlist: PlaylistAssignmentPlaylist;
  analysis: PlaylistAssignmentAnalysis;
  sourceText: string;
  signals: Record<SubjectSignal, number>;
}): number {
  const { playlist, analysis, sourceText, signals } = params;
  const text = playlistText(playlist);
  let score = 0;

  score += Math.min(7, tokenOverlapScore(sourceText, text));
  score += Math.min(5, tokenOverlapScore(analysis.semanticTags.join(' '), text));
  score += Math.min(6, tokenOverlapScore(analysis.suggestedPlaylistQuery, text));

  for (const subject of Object.keys(signals) as SubjectSignal[]) {
    if (signals[subject] > 0) {
      score += Math.min(12, signals[subject] * playlistSubjectScore(playlist, subject) * 2);
    }
  }

  if (signals.database >= 2) {
    if (isDatabasePlaylist(playlist)) {
      score += 8;
    } else if (normalizeText(playlistText(playlist)).includes('algoritmos')) {
      score -= 4;
    }
  }

  if (analysis.suggestedPlaylistId === playlist.id) {
    score += 4;
  }

  if (normalizeText(playlist.language) === normalizeText(analysis.language)) {
    score += 1;
  }

  if (playlist.course_code || playlist.unit_code) {
    score += 1;
  }

  if (isGeneralEducationPlaylist(playlist)) {
    score -= 6;
  }

  return score;
}

function normalizeConfidence(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return Math.min(1, Math.max(0, value));
}

function openAiAcceptedReason(playlistName: string): string {
  return `OpenAI suggested "${playlistName}" and deterministic adherence checks confirmed the match.`;
}

export function assignPlaylist(params: {
  playlists: PlaylistAssignmentPlaylist[];
  analysis: PlaylistAssignmentAnalysis;
  topCandidateLimit?: number;
}): PlaylistAssignmentResult {
  const { playlists, analysis, topCandidateLimit = 5 } = params;
  const sourceText = analysisText(analysis);
  const signals = getSubjectSignals(sourceText);
  const providerConfidence = normalizeConfidence(analysis.classificationConfidence);

  const scoredCandidates = playlists
    .map((playlist) => {
      const score = scorePlaylist({
        playlist,
        analysis,
        sourceText,
        signals,
      });
      const compatible = score >= MIN_PLAYLIST_ASSIGNMENT_SCORE && !hasStrongSubjectConflict(playlist, signals);
      const isAiSuggested = playlist.id === analysis.suggestedPlaylistId;

      return {
        playlistId: playlist.id,
        name: playlist.name,
        score,
        compatible,
        isAiSuggested,
      };
    })
    .sort((left, right) => right.score - left.score);

  const topCandidates = scoredCandidates.slice(0, topCandidateLimit);
  const suggestedCandidate = analysis.suggestedPlaylistId
    ? scoredCandidates.find((candidate) => candidate.playlistId === analysis.suggestedPlaylistId) ?? null
    : null;

  let assignedPlaylistId: string | null = null;
  let score = 0;
  let rejectedPlaylistId: string | null = null;
  let reason = 'No playlist met the direct content adherence threshold.';
  let decisionSource: PlaylistAssignmentResult['decisionSource'] = 'none';

  if (suggestedCandidate) {
    if (providerConfidence !== null && providerConfidence < MIN_PLAYLIST_ASSIGNMENT_CONFIDENCE) {
      rejectedPlaylistId = suggestedCandidate.playlistId;
      reason = 'OpenAI playlist suggestion rejected because classification confidence is below threshold.';
    } else if (!suggestedCandidate.compatible) {
      rejectedPlaylistId = suggestedCandidate.playlistId;
      reason = 'OpenAI playlist suggestion rejected by deterministic adherence checks.';
    } else {
      assignedPlaylistId = suggestedCandidate.playlistId;
      score = suggestedCandidate.score;
      reason = openAiAcceptedReason(suggestedCandidate.name);
      decisionSource = 'openai';
    }
  }

  const best = scoredCandidates[0] ?? null;
  const runnerUp = scoredCandidates[1] ?? null;
  if (!assignedPlaylistId && !suggestedCandidate && best?.compatible) {
    const bestPlaylist = playlists.find((playlist) => playlist.id === best.playlistId) ?? null;
    const margin = best.score - (runnerUp?.score ?? 0);
    const strongDatabaseMatch =
      signals.database >= 2 &&
      !!bestPlaylist &&
      isDatabasePlaylist(bestPlaylist) &&
      best.score >= MIN_DETERMINISTIC_PLAYLIST_SCORE;

    if (strongDatabaseMatch || (best.score >= MIN_DETERMINISTIC_PLAYLIST_SCORE && margin >= 4)) {
      assignedPlaylistId = best.playlistId;
      score = best.score;
      reason = strongDatabaseMatch
        ? 'Deterministic scoring selected a strong database playlist match.'
        : 'Deterministic scoring selected a strong curricular playlist match.';
      decisionSource = 'deterministic';
    }
  }

  return {
    algorithmVersion: PLAYLIST_ASSIGNMENT_ALGORITHM_VERSION,
    assignedPlaylistId,
    score,
    reliability: assignedPlaylistId ? 'high' : 'low',
    reason,
    topCandidates,
    rejectedPlaylistId,
    providerConfidence,
    decisionSource,
    signals,
  };
}

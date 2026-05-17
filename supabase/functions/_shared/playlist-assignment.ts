export type SubjectSignal = 'math' | 'design' | 'programming';

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
  semanticTags: string[];
  summaryDescription: string | null;
  shortSummary: string | null;
  language: string | null;
  geminiAssignedPlaylistId?: string | null;
  geminiConfidence?: number | null;
  geminiReason?: string | null;
};

export type PlaylistAssignmentTopCandidate = {
  playlistId: string;
  name: string;
  score: number;
  compatible: boolean;
  isGeminiSuggested: boolean;
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
  geminiConfidence: number | null;
  signals: Record<SubjectSignal, number>;
};

export const PLAYLIST_ASSIGNMENT_ALGORITHM_VERSION = 'playlist-assignment-v2';
export const MIN_PLAYLIST_ASSIGNMENT_CONFIDENCE = 0.70;
export const MIN_PLAYLIST_ASSIGNMENT_SCORE = 5;

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
    'dados',
    'software',
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

  score += Math.min(8, tokenOverlapScore(sourceText, text));
  score += Math.min(4, tokenOverlapScore(analysis.semanticTags.join(' '), text));

  for (const subject of Object.keys(signals) as SubjectSignal[]) {
    if (signals[subject] > 0) {
      score += Math.min(12, signals[subject] * playlistSubjectScore(playlist, subject) * 2);
    }
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

export function assignPlaylist(params: {
  playlists: PlaylistAssignmentPlaylist[];
  analysis: PlaylistAssignmentAnalysis;
  topCandidateLimit?: number;
}): PlaylistAssignmentResult {
  const { playlists, analysis, topCandidateLimit = 5 } = params;
  const sourceText = analysisText(analysis);
  const signals = getSubjectSignals(sourceText);
  const geminiConfidence = normalizeConfidence(analysis.geminiConfidence);

  const scoredCandidates = playlists
    .map((playlist) => {
      const score = scorePlaylist({
        playlist,
        analysis,
        sourceText,
        signals,
      });
      const compatible = score >= MIN_PLAYLIST_ASSIGNMENT_SCORE && !hasStrongSubjectConflict(playlist, signals);
      const isGeminiSuggested = playlist.id === analysis.geminiAssignedPlaylistId;

      return {
        playlistId: playlist.id,
        name: playlist.name,
        score,
        compatible,
        isGeminiSuggested,
        isAiSuggested: isGeminiSuggested,
      };
    })
    .sort((left, right) => right.score - left.score);

  const topCandidates = scoredCandidates.slice(0, topCandidateLimit);
  const geminiCandidate = analysis.geminiAssignedPlaylistId
    ? scoredCandidates.find((candidate) => candidate.playlistId === analysis.geminiAssignedPlaylistId) ?? null
    : null;

  let assignedPlaylistId: string | null = null;
  let score = 0;
  let rejectedPlaylistId: string | null = null;
  let reason = 'No playlist met the content adherence threshold';

  if (geminiCandidate && geminiConfidence !== null && geminiConfidence >= MIN_PLAYLIST_ASSIGNMENT_CONFIDENCE) {
    if (geminiCandidate.compatible) {
      assignedPlaylistId = geminiCandidate.playlistId;
      score = geminiCandidate.score;
      reason = analysis.geminiReason || 'Gemini playlist suggestion accepted after deterministic adherence check';
    } else {
      rejectedPlaylistId = geminiCandidate.playlistId;
      reason = 'Gemini playlist suggestion rejected by deterministic adherence check';
    }
  } else if (analysis.geminiAssignedPlaylistId) {
    rejectedPlaylistId = analysis.geminiAssignedPlaylistId;
    reason = 'Gemini playlist suggestion rejected because confidence is below threshold';
  }

  return {
    algorithmVersion: PLAYLIST_ASSIGNMENT_ALGORITHM_VERSION,
    assignedPlaylistId,
    score,
    reliability: assignedPlaylistId ? 'high' : 'low',
    reason,
    topCandidates,
    rejectedPlaylistId,
    geminiConfidence,
    signals,
  };
}

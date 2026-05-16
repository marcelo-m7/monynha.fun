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

export type PlaylistAssignmentEnrichment = {
  semantic_tags: string[];
  suggested_category: string | null;
  suggested_playlist_id: string | null;
  suggested_playlist_query: string | null;
  classification_confidence: number;
  language: string;
};

export type PlaylistAssignmentVideo = {
  title: string | null;
  description: string | null;
  channelName: string | null;
  language: string;
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
  rejectedAiPlaylistId: string | null;
  signals: Record<SubjectSignal, number>;
};

export const PLAYLIST_ASSIGNMENT_ALGORITHM_VERSION = 'playlist-assignment-v1';

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
    'murakami',
    'rapidola',
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

function playlistSubjectScore(playlist: PlaylistAssignmentPlaylist, subject: SubjectSignal): number {
  return subjectSignalScore(playlistText(playlist), subject);
}

function getOriginalVideoText(video: PlaylistAssignmentVideo): string {
  return [
    video.title ?? '',
    video.description ?? '',
    video.channelName ?? '',
  ].join(' ');
}

function isPlaylistCompatibleWithSignals(
  playlist: PlaylistAssignmentPlaylist,
  signals: Record<SubjectSignal, number>,
): boolean {
  if (signals.math >= 2) {
    return playlistSubjectScore(playlist, 'math') > 0;
  }

  if (signals.design >= 2) {
    return playlistSubjectScore(playlist, 'design') > 0;
  }

  if (signals.programming >= 2) {
    return playlistSubjectScore(playlist, 'programming') > 0;
  }

  return true;
}

function scorePlaylistAgainstOriginalSource(
  playlist: PlaylistAssignmentPlaylist,
  sourceText: string,
  videoLanguage: string,
  signals: Record<SubjectSignal, number>,
): number {
  let score = 0;
  const text = playlistText(playlist);

  score += Math.min(8, tokenOverlapScore(sourceText, text));

  const playlistMath = playlistSubjectScore(playlist, 'math');
  const playlistDesign = playlistSubjectScore(playlist, 'design');
  const playlistProgramming = playlistSubjectScore(playlist, 'programming');

  if (signals.math >= 2) {
    score += playlistMath * 6;
    if (playlistDesign > 0 && playlistMath === 0) score -= 18;
    if (normalizeText(playlist.name).includes('matematica ii')) score += 14;
    if (normalizeText(playlist.name).includes('matematica i')) score += 6;
  }

  if (signals.design >= 2) {
    score += playlistDesign * 5;
    if (playlistMath > 0 && playlistDesign === 0) score -= 8;
  }

  if (signals.programming >= 2) {
    score += playlistProgramming * 5;
    if (playlistDesign > 0 && playlistProgramming === 0) score -= 8;
  }

  if (normalizeText(playlist.language) === normalizeText(videoLanguage)) {
    score += 1;
  }

  if (playlist.course_code || playlist.unit_code) {
    score += 1;
  }

  return score;
}

function scorePlaylist(params: {
  playlist: PlaylistAssignmentPlaylist;
  enrichment: PlaylistAssignmentEnrichment;
  sourceText: string;
  videoLanguage: string;
  signals: Record<SubjectSignal, number>;
}): number {
  const { playlist, enrichment, sourceText, videoLanguage, signals } = params;
  const text = playlistText(playlist);
  let score = scorePlaylistAgainstOriginalSource(playlist, sourceText, videoLanguage, signals);

  score += Math.min(4, tokenOverlapScore(enrichment.suggested_playlist_query, text));
  score += Math.min(2, tokenOverlapScore(enrichment.suggested_category, text));
  score += Math.min(3, tokenOverlapScore(enrichment.semantic_tags.join(' '), text));

  return score;
}

export function assignPlaylist(params: {
  playlists: PlaylistAssignmentPlaylist[];
  enrichment: PlaylistAssignmentEnrichment;
  video: PlaylistAssignmentVideo;
  topCandidateLimit?: number;
}): PlaylistAssignmentResult {
  const { playlists, enrichment, video, topCandidateLimit = 5 } = params;
  const sourceText = getOriginalVideoText(video);
  const signals = getSubjectSignals(sourceText);

  const scoredCandidates = playlists
    .map((playlist) => {
      const compatible = isPlaylistCompatibleWithSignals(playlist, signals);
      return {
        playlistId: playlist.id,
        name: playlist.name,
        score: scorePlaylist({
          playlist,
          enrichment,
          sourceText,
          videoLanguage: video.language || enrichment.language || 'pt',
          signals,
        }),
        compatible,
        isAiSuggested: playlist.id === enrichment.suggested_playlist_id,
      };
    })
    .sort((left, right) => right.score - left.score);

  const topCandidates = scoredCandidates.slice(0, topCandidateLimit);
  const aiCandidate = enrichment.suggested_playlist_id
    ? scoredCandidates.find((candidate) => candidate.playlistId === enrichment.suggested_playlist_id) ?? null
    : null;

  const rejectedAiPlaylistId = aiCandidate && !aiCandidate.compatible
    ? aiCandidate.playlistId
    : null;

  let assignedPlaylistId: string | null = null;
  let score = 0;
  let reason = 'No playlist met the reliability threshold';

  if (aiCandidate?.compatible) {
    assignedPlaylistId = aiCandidate.playlistId;
    score = aiCandidate.score;
    reason = 'AI playlist suggestion accepted after source-signal compatibility check';
  } else {
    const bestCompatibleCandidate = scoredCandidates.find((candidate) => candidate.compatible) ?? null;
    if (bestCompatibleCandidate && bestCompatibleCandidate.score >= 5 && enrichment.classification_confidence >= 0.40) {
      assignedPlaylistId = bestCompatibleCandidate.playlistId;
      score = bestCompatibleCandidate.score;
      reason = rejectedAiPlaylistId
        ? 'AI playlist suggestion rejected by source-signal guard; best compatible candidate selected'
        : 'Best compatible playlist selected by source and enrichment score';
    }
  }

  return {
    algorithmVersion: PLAYLIST_ASSIGNMENT_ALGORITHM_VERSION,
    assignedPlaylistId,
    score,
    reliability: assignedPlaylistId ? 'high' : 'low',
    reason,
    topCandidates,
    rejectedAiPlaylistId,
    signals,
  };
}

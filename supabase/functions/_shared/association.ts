import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { pickCategory, type LegacyFastCategory, normalizeText } from './legacy-fast-enrichment.ts';
import { assignPlaylist, type PlaylistAssignmentPlaylist, type PlaylistAssignmentResult, type PlaylistAssignmentTopCandidate } from './playlist-assignment.ts';

export type AutoAssociationAnalysis = {
  title?: string | null;
  description?: string | null;
  channelName?: string | null;
  semanticTags: string[];
  summaryDescription?: string | null;
  shortSummary?: string | null;
  language: string;
  suggestedPlaylistId?: string | null;
  suggestedPlaylistQuery?: string | null;
  classificationConfidence?: number | null;
  currentCategoryId?: string | null;
};

export type AutoAssociationDecision = {
  videoId: string;
  assignedCategoryId: string | null;
  assignedCategoryName: string | null;
  assignedPlaylistId: string | null;
  assignedPlaylistIds: string[];
  confidence: 'high' | 'low';
  fallbackUsed: boolean;
  reasons: string[];
  topCandidates: PlaylistAssignmentTopCandidate[];
  playlistAssignment: PlaylistAssignmentResult;
};

type CategoryRow = LegacyFastCategory;

function hasCulinarySignals(sourceText: string) {
  const normalized = normalizeText(sourceText);
  return [
    'receita',
    'receitas',
    'culinaria',
    'cozinha',
    'gastronomia',
    'sopa',
    'cebola',
    'ingrediente',
    'chef',
    'forno',
    'assado',
  ].some((keyword) => normalized.includes(keyword));
}

async function fetchCulinaryPlaylists(supabaseServiceRole: ReturnType<typeof createClient>) {
  const { data, error } = await supabaseServiceRole
    .from('playlists')
    .select('id, name, description, language, is_public, is_ordered, course_code, unit_code')
    .eq('is_public', true)
    .or('slug.ilike.%receita%,name.ilike.%receita%,description.ilike.%receita%,slug.ilike.%culinaria%,name.ilike.%culinaria%,description.ilike.%culinaria%')
    .order('video_count', { ascending: false })
    .limit(60);

  if (error) {
    throw new Error(`Failed to load recipe playlist candidates: ${error.message}`);
  }

  return (data ?? []) as PlaylistAssignmentPlaylist[];
}

export async function loadAssociationCategories(supabaseServiceRole: ReturnType<typeof createClient>) {
  const { data, error } = await supabaseServiceRole
    .from('categories')
    .select('id, name, slug')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to load categories: ${error.message}`);
  }

  return (data ?? []) as CategoryRow[];
}

export async function loadAssociationPlaylists(
  supabaseServiceRole: ReturnType<typeof createClient>,
  language: string,
  sourceText?: string,
) {
  const { data, error } = await supabaseServiceRole.rpc('list_education_playlists_for_assignment', {
    p_language: language,
    p_limit: 120,
  });

  if (error) {
    throw new Error(`Failed to load playlist assignment candidates: ${error.message}`);
  }

  const baseCandidates = (data ?? []) as PlaylistAssignmentPlaylist[];
  if (!hasCulinarySignals(sourceText ?? '')) {
    return baseCandidates;
  }

  const culinaryPlaylists = await fetchCulinaryPlaylists(supabaseServiceRole);
  const byId = new Map<string, PlaylistAssignmentPlaylist>();

  for (const item of baseCandidates) {
    byId.set(item.id, item);
  }

  for (const item of culinaryPlaylists) {
    byId.set(item.id, item);
  }

  return Array.from(byId.values());
}

export function buildAutoAssociationDecision(params: {
  videoId: string;
  categories: CategoryRow[];
  playlists: PlaylistAssignmentPlaylist[];
  analysis: AutoAssociationAnalysis;
}): AutoAssociationDecision {
  const category = pickCategory(params.categories, {
    currentCategoryId: params.analysis.currentCategoryId ?? null,
    title: params.analysis.title ?? null,
    description: params.analysis.description ?? null,
    channelName: params.analysis.channelName ?? null,
    semanticTags: params.analysis.semanticTags,
  });

  const playlistAssignment = assignPlaylist({
    playlists: params.playlists,
    analysis: {
      title: params.analysis.title ?? null,
      description: params.analysis.description ?? null,
      semanticTags: params.analysis.semanticTags,
      summaryDescription: params.analysis.summaryDescription ?? null,
      shortSummary: params.analysis.shortSummary ?? null,
      language: params.analysis.language,
      suggestedPlaylistId: params.analysis.suggestedPlaylistId ?? null,
      suggestedPlaylistQuery: params.analysis.suggestedPlaylistQuery ?? params.analysis.semanticTags.join(' '),
      classificationConfidence: params.analysis.classificationConfidence ?? null,
    },
  });

  const assignedPlaylistIds = playlistAssignment.assignedPlaylistId ? [playlistAssignment.assignedPlaylistId] : [];
  const reasons = [playlistAssignment.reason];

  if (category) {
    reasons.push(`category:${category.name}`);
  }

  if (playlistAssignment.topCandidates[0]?.name) {
    reasons.push(`playlist:${playlistAssignment.topCandidates[0].name}`);
  }

  if (params.analysis.semanticTags.length > 0) {
    reasons.push(`semantic-tags:${params.analysis.semanticTags.slice(0, 3).join(', ')}`);
  }

  return {
    videoId: params.videoId,
    assignedCategoryId: category?.id ?? null,
    assignedCategoryName: category?.name ?? null,
    assignedPlaylistId: playlistAssignment.assignedPlaylistId,
    assignedPlaylistIds,
    confidence: playlistAssignment.assignedPlaylistId && category ? 'high' : 'low',
    fallbackUsed: !playlistAssignment.assignedPlaylistId || !category || playlistAssignment.reliability === 'low',
    reasons,
    topCandidates: playlistAssignment.topCandidates,
    playlistAssignment,
  };
}

export async function persistPlaylistAssignment(params: {
  supabaseServiceRole: ReturnType<typeof createClient>;
  assignment: PlaylistAssignmentResult;
  videoId: string;
  userId: string;
}) {
  const { supabaseServiceRole, assignment, videoId, userId } = params;
  if (!assignment.assignedPlaylistId) {
    return null;
  }

  const { data: existingAutoAssignments, error: existingAutoAssignmentsError } = await supabaseServiceRole
    .from('playlist_videos')
    .select('id, playlist_id')
    .eq('video_id', videoId)
    .ilike('notes', 'Assigned by playlist-assignment-v%');

  if (existingAutoAssignmentsError) {
    throw new Error(`Failed to load existing automatic playlist assignments: ${existingAutoAssignmentsError.message}`);
  }

  const staleAutoAssignmentIds = (existingAutoAssignments ?? [])
    .filter((item) => item.playlist_id !== assignment.assignedPlaylistId)
    .map((item) => item.id);

  if (staleAutoAssignmentIds.length > 0) {
    const { error: staleAutoAssignmentsDeleteError } = await supabaseServiceRole
      .from('playlist_videos')
      .delete()
      .in('id', staleAutoAssignmentIds);

    if (staleAutoAssignmentsDeleteError) {
      throw new Error(`Failed to clean stale automatic playlist assignments: ${staleAutoAssignmentsDeleteError.message}`);
    }
  }

  const { data: existing, error: existingError } = await supabaseServiceRole
    .from('playlist_videos')
    .select('id, playlist_id, position')
    .eq('playlist_id', assignment.assignedPlaylistId)
    .eq('video_id', videoId)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to check playlist assignment: ${existingError.message}`);
  }

  if (existing) {
    return { ...existing, created: false, removedAutoAssignments: staleAutoAssignmentIds.length };
  }

  const { data: lastItem, error: lastItemError } = await supabaseServiceRole
    .from('playlist_videos')
    .select('position')
    .eq('playlist_id', assignment.assignedPlaylistId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastItemError) {
    throw new Error(`Failed to resolve playlist position: ${lastItemError.message}`);
  }

  const nextPosition = typeof lastItem?.position === 'number' ? lastItem.position + 1 : 0;
  const notes = [
    `Assigned by ${assignment.algorithmVersion}`,
    assignment.reason,
  ].join(': ');

  const { data: inserted, error: insertError } = await supabaseServiceRole
    .from('playlist_videos')
    .insert({
      playlist_id: assignment.assignedPlaylistId,
      video_id: videoId,
      position: nextPosition,
      added_by: userId,
      notes,
    })
    .select('id, playlist_id, position')
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      const { data: racedAssignment, error: racedAssignmentError } = await supabaseServiceRole
        .from('playlist_videos')
        .select('id, playlist_id, position')
        .eq('playlist_id', assignment.assignedPlaylistId)
        .eq('video_id', videoId)
        .maybeSingle();

      if (!racedAssignmentError && racedAssignment) {
        return { ...racedAssignment, created: false, removedAutoAssignments: staleAutoAssignmentIds.length };
      }
    }

    throw new Error(`Failed to persist playlist assignment: ${insertError.message}`);
  }

  return { ...inserted, created: true, removedAutoAssignments: staleAutoAssignmentIds.length };
}

export async function persistAutoAssociation(params: {
  supabaseServiceRole: ReturnType<typeof createClient>;
  videoId: string;
  userId: string;
  decision: AutoAssociationDecision;
  currentCategoryId?: string | null;
}) {
  const { supabaseServiceRole, videoId, userId, decision, currentCategoryId } = params;
  let categoryUpdated = false;

  if (decision.assignedCategoryId && decision.assignedCategoryId !== currentCategoryId) {
    const { error } = await supabaseServiceRole
      .from('videos')
      .update({ category_id: decision.assignedCategoryId })
      .eq('id', videoId);

    if (error) {
      throw new Error(`Failed to persist assigned category: ${error.message}`);
    }

    categoryUpdated = true;
  }

  const playlistAssignment = await persistPlaylistAssignment({
    supabaseServiceRole,
    assignment: decision.playlistAssignment,
    videoId,
    userId,
  });

  return {
    categoryUpdated,
    playlistAssignment,
  };
}

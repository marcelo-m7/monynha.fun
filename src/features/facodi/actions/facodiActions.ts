import {
  getAnalysisJobStatus,
  getOdooSyncJobStatus,
  invokeFacodiMechanism,
  subscribeToAnalysisJob,
  subscribeToOdooSyncJob,
} from '@/entities/facodi/facodi.api';
import type {
  AnalyzeVideoPayload,
  GenerateCourseStructurePayload,
  GenerateModulePayload,
  GeneratePlaylistPayload,
  ImportYoutubeChannelPayload,
  ImportYoutubeVideoPayload,
  MatchVideoToCurriculumPayload,
  SyncLearningObjectToOdooPayload,
} from '../types';

export function importYoutubeVideo(payload: ImportYoutubeVideoPayload) {
  return invokeFacodiMechanism('v2_import_youtube_video', payload);
}

export function importYoutubeChannel(payload: ImportYoutubeChannelPayload) {
  return invokeFacodiMechanism('v2_import_youtube_channel', payload);
}

export function analyzeVideo(payload: AnalyzeVideoPayload) {
  return invokeFacodiMechanism('v2_analyze_video', payload);
}

export function matchVideoToCurriculum(payload: MatchVideoToCurriculumPayload) {
  return invokeFacodiMechanism('v2_match_video_to_curriculum', payload);
}

export function generatePlaylist(payload: GeneratePlaylistPayload) {
  return invokeFacodiMechanism('v2_generate_playlist', payload);
}

export function generateModule(payload: GenerateModulePayload) {
  return invokeFacodiMechanism('v2_generate_module', payload);
}

export function generateCourseStructure(payload: GenerateCourseStructurePayload) {
  return invokeFacodiMechanism('v2_generate_course_structure', payload);
}

export function syncLearningObjectToOdoo(payload: SyncLearningObjectToOdooPayload) {
  return invokeFacodiMechanism('v2_sync_object_to_odoo', payload);
}

export { getAnalysisJobStatus, getOdooSyncJobStatus, subscribeToAnalysisJob, subscribeToOdooSyncJob };
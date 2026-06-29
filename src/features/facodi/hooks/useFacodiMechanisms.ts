import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { facodiKeys } from '@/entities/facodi/facodi.keys';
import {
  analyzeVideo,
  generateCourseStructure,
  generateModule,
  generatePlaylist,
  getAnalysisJobStatus,
  getOdooSyncJobStatus,
  importYoutubeChannel,
  importYoutubeVideo,
  matchVideoToCurriculum,
  subscribeToAnalysisJob,
  subscribeToOdooSyncJob,
  syncLearningObjectToOdoo,
} from '../actions/facodiActions';
import type {
  AnalyzeVideoPayload,
  FacodiAnalysisJob,
  FacodiMechanismResponse,
  FacodiOdooSyncJob,
  GenerateCourseStructurePayload,
  GenerateModulePayload,
  GeneratePlaylistPayload,
  ImportYoutubeChannelPayload,
  ImportYoutubeVideoPayload,
  MatchVideoToCurriculumPayload,
  SyncLearningObjectToOdooPayload,
} from '../types';

function useFacodiMechanismMutation<TPayload>(mutationFn: (payload: TPayload) => Promise<FacodiMechanismResponse>) {
  const queryClient = useQueryClient();

  return useMutation<FacodiMechanismResponse, Error, TPayload>({
    mutationFn,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: facodiKeys.jobs() });
      queryClient.invalidateQueries({ queryKey: facodiKeys.analysisJob(response.jobId) });
      queryClient.invalidateQueries({ queryKey: facodiKeys.odooSyncJob(response.jobId) });
    },
  });
}

export function useImportYoutubeVideo() {
  return useFacodiMechanismMutation<ImportYoutubeVideoPayload>(importYoutubeVideo);
}

export function useImportYoutubeChannel() {
  return useFacodiMechanismMutation<ImportYoutubeChannelPayload>(importYoutubeChannel);
}

export function useAnalyzeVideo() {
  return useFacodiMechanismMutation<AnalyzeVideoPayload>(analyzeVideo);
}

export function useMatchVideoToCurriculum() {
  return useFacodiMechanismMutation<MatchVideoToCurriculumPayload>(matchVideoToCurriculum);
}

export function useGeneratePlaylist() {
  return useFacodiMechanismMutation<GeneratePlaylistPayload>(generatePlaylist);
}

export function useGenerateModule() {
  return useFacodiMechanismMutation<GenerateModulePayload>(generateModule);
}

export function useGenerateCourseStructure() {
  return useFacodiMechanismMutation<GenerateCourseStructurePayload>(generateCourseStructure);
}

export function useSyncLearningObjectToOdoo() {
  return useFacodiMechanismMutation<SyncLearningObjectToOdooPayload>(syncLearningObjectToOdoo);
}

export function useAnalysisJobStatus(jobId: string | undefined) {
  return useQuery<FacodiAnalysisJob | null, Error>({
    queryKey: jobId ? facodiKeys.analysisJob(jobId) : facodiKeys.analysisJob(''),
    queryFn: () => (jobId ? getAnalysisJobStatus(jobId) : Promise.resolve(null)),
    enabled: Boolean(jobId),
  });
}

export function useOdooSyncJobStatus(jobId: string | undefined) {
  return useQuery<FacodiOdooSyncJob | null, Error>({
    queryKey: jobId ? facodiKeys.odooSyncJob(jobId) : facodiKeys.odooSyncJob(''),
    queryFn: () => (jobId ? getOdooSyncJobStatus(jobId) : Promise.resolve(null)),
    enabled: Boolean(jobId),
  });
}

export function useAnalysisJobSubscription(jobId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!jobId) return undefined;

    return subscribeToAnalysisJob(jobId, (job) => {
      queryClient.setQueryData<FacodiAnalysisJob | null>(facodiKeys.analysisJob(jobId), (current) => ({
        ...(current ?? {} as FacodiAnalysisJob),
        ...job,
      }));
    });
  }, [jobId, queryClient]);
}

export function useOdooSyncJobSubscription(jobId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!jobId) return undefined;

    return subscribeToOdooSyncJob(jobId, (job) => {
      queryClient.setQueryData<FacodiOdooSyncJob | null>(facodiKeys.odooSyncJob(jobId), (current) => ({
        ...(current ?? {} as FacodiOdooSyncJob),
        ...job,
      }));
    });
  }, [jobId, queryClient]);
}
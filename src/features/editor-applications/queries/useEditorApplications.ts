import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invokeEdgeFunction } from '@/shared/api/supabase/edgeFunctions';
import {
  createEditorApplication,
  listEditorApplications,
  updateEditorApplicationReview,
} from '@/entities/editor_application/editor_application.api';
import { editorApplicationKeys } from '@/entities/editor_application/editor_application.keys';
import type {
  EditorApplication,
  EditorApplicationInsert,
  EditorApplicationStatus,
  EditorApplicationReviewUpdate,
  ListEditorApplicationsParams,
} from '@/entities/editor_application/editor_application.types';
import { useAuth } from '@/features/auth/useAuth';
import { notify } from '@/shared/lib/notify';
import { useTranslation } from 'react-i18next';

export interface SubmitEditorApplicationPayload {
  applicantName: string;
  applicantEmail: string;
  motivation?: string;
  portfolioLinks?: string[];
  consentPrivacy: boolean;
  sourcePath?: string;
}

export interface SubmitEditorApplicationResult {
  application: EditorApplication;
  edgeError?: Error | null;
}

export function useSubmitEditorApplication() {
  const { t } = useTranslation();

  return useMutation<SubmitEditorApplicationResult, Error, SubmitEditorApplicationPayload>({
    mutationFn: async (payload) => {
      const insertPayload: EditorApplicationInsert = {
        full_name: payload.applicantName,
        email: payload.applicantEmail,
        motivation: payload.motivation || null,
        portfolio_url: payload.portfolioLinks?.[0] || null,
        consent_privacy: payload.consentPrivacy,
        source_page: payload.sourcePath || 'editor_apply_page',
        status: 'pending',
      };

      const application = await createEditorApplication(insertPayload);

      let edgeError: Error | null = null;
      try {
        const { error } = await invokeEdgeFunction('send-editor-application-confirmation', {
          body: {
            applicationId: application.id,
            fullName: application.full_name,
            email: application.email,
          },
          headers: { 'Content-Type': 'application/json' },
        });

        if (error) {
          edgeError = error as Error;
        }
      } catch (error) {
        edgeError = error instanceof Error ? error : new Error(String(error));
      }

      return {
        application,
        edgeError,
      };
    },
    onError: (error) => {
      notify.error(t('editorApplications.form.errorTitle'), {
        description: error.message,
      });
    },
  });
}

export function useEditorApplicationsList(params: ListEditorApplicationsParams) {
  return useQuery<EditorApplication[], Error>({
    queryKey: editorApplicationKeys.list(params),
    queryFn: () => listEditorApplications(params),
  });
}

export function useUpdateEditorApplicationStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<
    EditorApplication,
    Error,
    {
      applicationId: string;
      status: EditorApplicationStatus;
      statusNote?: string;
      listParams: ListEditorApplicationsParams;
    }
  >({
    mutationFn: async ({ applicationId, status, statusNote }) => {
      const payload: EditorApplicationReviewUpdate = {
        status,
        review_notes: statusNote || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id ?? null,
      };

      return updateEditorApplicationReview(applicationId, payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: editorApplicationKeys.list(variables.listParams),
      });
    },
  });
}

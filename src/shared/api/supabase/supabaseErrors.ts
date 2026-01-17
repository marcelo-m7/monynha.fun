export interface SupabaseErrorLike {
  message?: string | null;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
}

export function getSupabaseErrorMessage(error: SupabaseErrorLike | null | undefined): string {
  if (!error) return '';
  return error.message || error.details || error.hint || error.code || 'Unknown error';
}

/**
 * Environment Variable Validation
 * 
 * Ensures all required environment variables are set for Edge Functions
 */

export interface EnvironmentConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  openaiApiKey?: string;
  openaiModel?: string;
}

/**
 * Validate and load environment variables
 * Throws error if required variables are missing
 */
export function validateEnvironment(): EnvironmentConfig {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  const openaiModel = Deno.env.get('OPENAI_MODEL');

  const errors: string[] = [];

  if (!supabaseUrl) errors.push('SUPABASE_URL is required');
  if (!supabaseAnonKey) errors.push('SUPABASE_ANON_KEY is required');
  if (!supabaseServiceRoleKey) errors.push('SUPABASE_SERVICE_ROLE_KEY is required');

  if (errors.length > 0) {
    throw new Error(`Missing required environment variables:\n${errors.join('\n')}`);
  }

  return {
    supabaseUrl: supabaseUrl!,
    supabaseAnonKey: supabaseAnonKey!,
    supabaseServiceRoleKey: supabaseServiceRoleKey!,
    openaiApiKey,
    openaiModel,
  };
}

/**
 * Validate OpenAI-specific environment variables
 * Used by functions that need OpenAI integration
 */
export function validateOpenAIEnvironment(): EnvironmentConfig & { openaiApiKey: string; openaiModel: string } {
  const config = validateEnvironment();

  if (!config.openaiApiKey) {
    throw new Error('OPENAI_API_KEY is required for AI enrichment');
  }

  return {
    ...config,
    openaiApiKey: config.openaiApiKey,
    openaiModel: config.openaiModel || 'gpt-4o-mini',
  };
}

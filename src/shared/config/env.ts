import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export type AppEnv = z.infer<typeof envSchema>;

export function getEnv(): AppEnv {
  return envSchema.parse(import.meta.env);
}

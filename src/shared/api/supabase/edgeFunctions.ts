import { supabase } from './supabaseClient';

interface InvokeOptions {
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export async function invokeEdgeFunction<T>(name: string, options: InvokeOptions = {}) {
  return supabase.functions.invoke<T>(name, {
    body: options.body,
    headers: options.headers,
  });
}

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://wvkjainfwsyiyfcmbtid.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2a2phaW5md3N5aXlmY21idGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2Njg5NzgsImV4cCI6MjA4MzI0NDk3OH0.hop4JCRh_mvbmVjsvPIRdW_rhrfRhMqzomLx1xijwSw";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
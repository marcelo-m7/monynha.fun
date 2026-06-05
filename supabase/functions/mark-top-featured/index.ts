import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { errorResponse, jsonResponse, optionsResponse } from '../_shared/http.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return optionsResponse(req)
  }

  if (req.method !== 'POST') {
    return errorResponse(req, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed')
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '') ?? ''

    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse(req, 500, 'MISSING_SUPABASE_ENV', 'Missing Supabase environment variables')
    }

    if (token !== serviceRoleKey) {
      console.error('[mark-top-featured] Unauthorized request rejected.')
      return errorResponse(req, 401, 'UNAUTHORIZED', 'Unauthorized')
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

    const body = await req.json().catch(() => ({}))
    const limit = typeof body.limit === 'number' ? Math.max(1, Math.min(Math.trunc(body.limit), 20)) : 4

    const { data, error } = await supabase.rpc('mark_top_videos_as_featured', { p_limit: limit })

    if (error) {
      console.error('[mark-top-featured] RPC error:', error.message)
      return errorResponse(req, 500, 'MARK_TOP_FEATURED_FAILED', 'Could not mark top videos as featured')
    }

    return jsonResponse(req, { message: 'Marked top videos as featured', updated: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[mark-top-featured] Handler error:', message)
    return errorResponse(req, 500, 'MARK_TOP_FEATURED_FAILED', 'Could not mark top videos as featured')
  }
})

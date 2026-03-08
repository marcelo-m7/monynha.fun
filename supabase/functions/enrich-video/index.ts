import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { createOpenAIClient, type VideoEnrichmentParams } from '../_shared/openai-client.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Manual authentication handling (since verify_jwt is false)
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    console.error("[enrich-video] Unauthorized: No Authorization header provided.")
    return new Response('Unauthorized', {
      status: 401,
      headers: corsHeaders
    })
  }

  const token = authHeader.replace('Bearer ', '')
  // Client for user authentication (uses ANON_KEY and user's JWT)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    console.error("[enrich-video] User authentication failed:", userError?.message)
    return new Response('Unauthorized', {
      status: 401,
      headers: corsHeaders
    })
  }

  try {
    const { videoId, youtubeUrl } = await req.json()
    console.log(`[enrich-video] Received request for videoId: ${videoId}, youtubeUrl: ${youtubeUrl} by user: ${user.id}`)

    // Create a separate client for service role operations (bypasses RLS)
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch the video data from database
    const { data: video, error: videoError } = await supabaseServiceRole
      .from('videos')
      .select('title, description, language')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      console.error("[enrich-video] Video not found:", videoError?.message);
      throw new Error(`Video not found: ${videoError?.message || 'Unknown error'}`);
    }

    // Call OpenAI for enrichment
    let enrichment;
    try {
      const openaiClient = createOpenAIClient();
      const enrichmentParams: VideoEnrichmentParams = {
        title: video.title || '',
        description: video.description || '',
        language: video.language || 'pt',
      };
      enrichment = await openaiClient.enrichVideo(enrichmentParams);
      console.log(`[enrich-video] Successfully enriched video ${videoId} with OpenAI`);
    } catch (openaiError) {
      const errorMsg = openaiError instanceof Error ? openaiError.message : 'Unknown OpenAI error';
      console.error("[enrich-video] OpenAI enrichment failed:", errorMsg);
      
      // If OpenAI fails, we can either:
      // 1. Return error (fail the request)
      // 2. Create a fallback enrichment with null/default values
      // For now, we'll fail to ensure data quality
      throw new Error(`AI enrichment failed: ${errorMsg}`);
    }

    const { data, error } = await supabaseServiceRole
      .from('ai_enrichments')
      .insert({
        video_id: videoId,
        ...enrichment
      })
      .select()
      .single();

    if (error) {
      console.error("[enrich-video] Error inserting AI enrichment:", error.message);
      throw new Error(`Failed to save AI enrichment: ${error.message}`);
    }

    console.log(`[enrich-video] AI enrichment processed and saved for videoId: ${videoId}`);

    return new Response(JSON.stringify({ message: 'AI enrichment initiated and saved successfully', data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`[enrich-video] Error processing request: ${errorMessage}`)
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
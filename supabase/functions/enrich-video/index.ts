import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

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

    // --- Placeholder for actual AI enrichment logic ---
    // In a real scenario, you would call an external AI service here
    // using an API key stored as a Supabase secret.
    // Example:
    // const aiApiKey = Deno.env.get('OPENAI_API_KEY');
    // const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', { ... });
    // const enrichedData = parseAiResponse(aiResponse);

    // For now, we'll simulate some enrichment and store it.
    const simulatedEnrichment = {
      optimized_title: `Monynha Fun: ${videoId} - Título Otimizado`,
      summary_description: `Este é um resumo gerado por IA para o vídeo ${videoId} da URL ${youtubeUrl}.`,
      semantic_tags: ['monynha', 'fun', 'ia', 'curadoria'],
      suggested_category_id: null, // Placeholder, would be determined by AI
      language: 'pt', // Placeholder, would be determined by AI
      cultural_relevance: 'Alta',
      short_summary: 'Um vídeo interessante sobre tecnologia e comunidade.',
    };

    const { data, error } = await supabase
      .from('ai_enrichments')
      .insert({
        video_id: videoId,
        ...simulatedEnrichment
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
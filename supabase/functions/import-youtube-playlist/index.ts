import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to extract YouTube playlist ID
function extractYouTubePlaylistId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const listId = urlObj.searchParams.get('list');
    return listId;
  } catch (e) {
    console.error("[import-youtube-playlist] Error parsing URL:", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate the user making the request
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    console.error("[import-youtube-playlist] Unauthorized: No Authorization header provided.");
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("[import-youtube-playlist] User authentication failed:", userError?.message);
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  try {
    const { playlistUrl } = await req.json();
    console.log(`[import-youtube-playlist] Received request for playlistUrl: ${playlistUrl} by user: ${user.id}`);

    const youtubePlaylistId = extractYouTubePlaylistId(playlistUrl);
    if (!youtubePlaylistId) {
      console.error("[import-youtube-playlist] Invalid YouTube playlist URL provided.");
      return new Response(JSON.stringify({ error: 'Invalid YouTube playlist URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY'); // Changed from GEMINI_API_KEY
    if (!YOUTUBE_API_KEY) {
      console.error("[import-youtube-playlist] YOUTUBE_API_KEY is not set.");
      return new Response(JSON.stringify({ error: 'Server configuration error: YouTube API key missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    interface YouTubePlaylistItem {
      snippet?: {
        title: string;
        description: string;
        channelTitle: string;
        thumbnails?: {
          maxres?: { url: string };
          high?: { url: string };
          medium?: { url: string };
          default?: { url: string };
        };
        defaultLanguage?: string;
      };
      contentDetails?: {
        videoId: string;
      };
    }

    let allVideos: YouTubePlaylistItem[] = [];
    let nextPageToken: string | undefined = undefined;

    do {
      const youtubeApiUrl = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
      youtubeApiUrl.searchParams.append('part', 'snippet,contentDetails');
      youtubeApiUrl.searchParams.append('playlistId', youtubePlaylistId);
      youtubeApiUrl.searchParams.append('key', YOUTUBE_API_KEY);
      youtubeApiUrl.searchParams.append('maxResults', '50'); // Max allowed by API
      if (nextPageToken) {
        youtubeApiUrl.searchParams.append('pageToken', nextPageToken);
      }

      const youtubeResponse = await fetch(youtubeApiUrl.toString());
      if (!youtubeResponse.ok) {
        const errorText = await youtubeResponse.text();
        console.error(`[import-youtube-playlist] YouTube API error: ${youtubeResponse.status} - ${errorText}`);
        throw new Error(`Failed to fetch playlist from YouTube: ${errorText}`);
      }

      const youtubeData = await youtubeResponse.json();
      allVideos = allVideos.concat(youtubeData.items);
      nextPageToken = youtubeData.nextPageToken;

    } while (nextPageToken);

    const processedVideos = allVideos
      .filter(item => item.snippet && item.contentDetails && item.contentDetails.videoId && item.snippet.title !== 'Private video' && item.snippet.title !== 'Deleted video')
      .map(item => ({
        youtube_id: item.contentDetails.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        channel_name: item.snippet.channelTitle,
        thumbnail_url: item.snippet.thumbnails?.maxres?.url || item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '/placeholder.svg',
        // Duration is not directly available in playlistItems, would require separate video API calls
        // For simplicity, we'll omit duration here or set to a default/null
        duration_seconds: null, // Will be enriched later by 'enrich-video' if submitted individually
        language: item.snippet.defaultLanguage || 'pt', // Default to pt if not specified
      }));

    console.log(`[import-youtube-playlist] Successfully fetched ${processedVideos.length} videos for playlist ${youtubePlaylistId}`);

    return new Response(JSON.stringify({ playlistId: youtubePlaylistId, videos: processedVideos }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`[import-youtube-playlist] Error processing request: ${errorMessage}`);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
import { extname, join, normalize, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const DIST_DIR = resolve(process.cwd(), 'dist');
const INDEX_PATH = join(DIST_DIR, 'index.html');

const normalizeEnv = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

const SUPABASE_URL = normalizeEnv(process.env.SUPABASE_URL);
const SUPABASE_ANON_KEY = normalizeEnv(process.env.SUPABASE_ANON_KEY);

const ONE_YEAR_SECONDS = 31536000;
const ONE_HOUR_SECONDS = 3600;

const VIDEO_ROUTE_REGEX = /^\/videos\/([^/]+)\/?$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const trimSummary = (value: string | null | undefined, maxLength = 160): string => {
  const text = (value ?? '').trim();
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}...`;
};

const isSafePath = (pathname: string): boolean => {
  if (pathname.includes('\0')) return false;
  const normalized = normalize(pathname);
  return !normalized.includes('..');
};

const resolveStaticFile = (pathname: string): string | null => {
  if (!isSafePath(pathname)) return null;

  const relativePath = pathname.startsWith('/') ? pathname.slice(1) : pathname;
  const filePath = resolve(join(DIST_DIR, relativePath));

  if (!filePath.startsWith(DIST_DIR)) {
    return null;
  }

  return filePath;
};

const buildMetaBlock = (params: {
  title: string;
  description: string;
  image: string;
  url: string;
}): string => {
  const { title, description, image, url } = params;

  return [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta property="og:type" content="video.other" />`,
    `<meta property="og:site_name" content="Tube O2" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
  ].join('\n');
};

const stripManagedHeadTags = (html: string): string => {
  const patterns = [
    /<title>[\s\S]*?<\/title>/gi,
    /<meta[^>]*name=["']description["'][^>]*>/gi,
    /<meta[^>]*property=["']og:title["'][^>]*>/gi,
    /<meta[^>]*property=["']og:description["'][^>]*>/gi,
    /<meta[^>]*property=["']og:image["'][^>]*>/gi,
    /<meta[^>]*property=["']og:url["'][^>]*>/gi,
    /<meta[^>]*property=["']og:type["'][^>]*>/gi,
    /<meta[^>]*property=["']og:site_name["'][^>]*>/gi,
    /<meta[^>]*name=["']twitter:card["'][^>]*>/gi,
    /<meta[^>]*name=["']twitter:title["'][^>]*>/gi,
    /<meta[^>]*name=["']twitter:description["'][^>]*>/gi,
    /<meta[^>]*name=["']twitter:image["'][^>]*>/gi,
  ];

  return patterns.reduce((acc, pattern) => acc.replace(pattern, ''), html);
};

const injectMetaIntoHtml = (html: string, metaBlock: string): string => {
  const cleaned = stripManagedHeadTags(html);
  return cleaned.replace('</head>', `${metaBlock}\n</head>`);
};

type VideoRow = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  youtube_id: string;
};

type EnrichmentRow = {
  short_summary: string | null;
};

const supabaseClient =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

const fetchVideoMeta = async (videoIdOrYoutubeId: string): Promise<{
  title: string;
  description: string;
  image: string;
} | null> => {
  if (!supabaseClient) {
    return null;
  }

  let videoQuery = supabaseClient
    .from('videos')
    .select('id, title, description, thumbnail_url, youtube_id')
    .limit(1);

  if (UUID_REGEX.test(videoIdOrYoutubeId)) {
    videoQuery = videoQuery.eq('id', videoIdOrYoutubeId);
  } else {
    videoQuery = videoQuery.eq('youtube_id', videoIdOrYoutubeId);
  }

  const { data: video, error: videoError } = await videoQuery.maybeSingle();

  if (videoError || !video) {
    return null;
  }

  const { data: enrichment, error: enrichmentError } = await supabaseClient
    .from('ai_enrichments')
    .select('short_summary')
    .eq('video_id', video.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const shortSummary = enrichmentError ? '' : (enrichment as EnrichmentRow | null)?.short_summary?.trim() ?? '';

  const fallbackDescription = trimSummary(video.description, 160);

  return {
    title: `${video.title} | Tube O2`,
    description: shortSummary || fallbackDescription || 'Watch this video on Tube O2.',
    image: video.thumbnail_url || 'https://tube.open2.tech/placeholder.png',
  };
};

const serveIndex = async (url: URL): Promise<Response> => {
  const indexFile = Bun.file(INDEX_PATH);
  const template = await indexFile.text();

  const routeMatch = url.pathname.match(VIDEO_ROUTE_REGEX);
  if (!routeMatch) {
    return new Response(template, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-cache',
      },
    });
  }

  const videoId = routeMatch[1];

  try {
    const metadata = await fetchVideoMeta(videoId);
    if (!metadata) {
      return new Response(template, {
        status: 200,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-cache',
        },
      });
    }

    const metaBlock = buildMetaBlock({
      title: metadata.title,
      description: metadata.description,
      image: metadata.image,
      url: url.toString(),
    });

    return new Response(injectMetaIntoHtml(template, metaBlock), {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-cache',
      },
    });
  } catch {
    return new Response(template, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-cache',
      },
    });
  }
};

const serveStatic = async (pathname: string): Promise<Response | null> => {
  const filePath = resolveStaticFile(pathname);
  if (!filePath) return null;

  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    return null;
  }

  const isAssetPath = pathname.startsWith('/assets/');

  return new Response(file, {
    status: 200,
    headers: {
      'cache-control': isAssetPath
        ? `public, max-age=${ONE_YEAR_SECONDS}, immutable`
        : `public, max-age=${ONE_HOUR_SECONDS}`,
    },
  });
};

const server = Bun.serve({
  port: Number(process.env.PORT || 3000),
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const staticResponse = await serveStatic(url.pathname);
    if (staticResponse) return staticResponse;

    return serveIndex(url);
  },
});

console.log(`Bun server running at ${server.url}`);
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('SUPABASE_URL or SUPABASE_ANON_KEY is not set. Video-specific OG tags will fallback to generic index meta.');
}

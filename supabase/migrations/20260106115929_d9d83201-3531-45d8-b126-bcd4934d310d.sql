-- Make submitted_by nullable to allow system/imported content
ALTER TABLE public.videos ALTER COLUMN submitted_by DROP NOT NULL;

-- Insert example videos (using default "Não Classificados" category)
INSERT INTO public.videos (youtube_id, title, description, channel_name, duration_seconds, thumbnail_url, language, category_id, is_featured, view_count)
SELECT 
  'dQw4w9WgXcQ',
  'Rick Astley - Never Gonna Give You Up',
  'O meme mais famoso da internet. Rick Astley cantando seu maior sucesso de 1987.',
  'Rick Astley',
  213,
  'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
  'en',
  (SELECT id FROM public.categories WHERE slug = 'memes-iconicos'),
  true,
  1500000
WHERE NOT EXISTS (SELECT 1 FROM public.videos WHERE youtube_id = 'dQw4w9WgXcQ');

INSERT INTO public.videos (youtube_id, title, description, channel_name, duration_seconds, thumbnail_url, language, category_id, is_featured, view_count)
SELECT 
  'kJQP7kiw5Fk',
  'Luis Fonsi - Despacito ft. Daddy Yankee',
  'O vídeo mais visto do YouTube por anos. Um clássico da música latina.',
  'Luis Fonsi',
  282,
  'https://img.youtube.com/vi/kJQP7kiw5Fk/maxresdefault.jpg',
  'es',
  (SELECT id FROM public.categories WHERE slug = 'musica'),
  true,
  8200000
WHERE NOT EXISTS (SELECT 1 FROM public.videos WHERE youtube_id = 'kJQP7kiw5Fk');

INSERT INTO public.videos (youtube_id, title, description, channel_name, duration_seconds, thumbnail_url, language, category_id, is_featured, view_count)
SELECT 
  '9bZkp7q19f0',
  'PSY - GANGNAM STYLE',
  'O primeiro vídeo a atingir 1 bilhão de visualizações no YouTube.',
  'officialpsy',
  253,
  'https://img.youtube.com/vi/9bZkp7q19f0/maxresdefault.jpg',
  'ko',
  (SELECT id FROM public.categories WHERE slug = 'memes-iconicos'),
  true,
  4800000
WHERE NOT EXISTS (SELECT 1 FROM public.videos WHERE youtube_id = '9bZkp7q19f0');

INSERT INTO public.videos (youtube_id, title, description, channel_name, duration_seconds, thumbnail_url, language, category_id, is_featured, view_count)
SELECT 
  'YQHsXMglC9A',
  'Adele - Hello',
  'Uma das baladas mais poderosas da década de 2010.',
  'Adele',
  367,
  'https://img.youtube.com/vi/YQHsXMglC9A/maxresdefault.jpg',
  'en',
  (SELECT id FROM public.categories WHERE slug = 'musica'),
  false,
  3100000
WHERE NOT EXISTS (SELECT 1 FROM public.videos WHERE youtube_id = 'YQHsXMglC9A');

INSERT INTO public.videos (youtube_id, title, description, channel_name, duration_seconds, thumbnail_url, language, category_id, is_featured, view_count)
SELECT 
  'hY7m5jjJ9mM',
  'Charlie bit my finger - again!',
  'Um dos primeiros vídeos virais do YouTube. Clássico absoluto.',
  'HDCYT',
  56,
  'https://img.youtube.com/vi/hY7m5jjJ9mM/maxresdefault.jpg',
  'en',
  (SELECT id FROM public.categories WHERE slug = 'memes-iconicos'),
  false,
  890000
WHERE NOT EXISTS (SELECT 1 FROM public.videos WHERE youtube_id = 'hY7m5jjJ9mM');

INSERT INTO public.videos (youtube_id, title, description, channel_name, duration_seconds, thumbnail_url, language, category_id, is_featured, view_count)
SELECT 
  'fJ9rUzIMcZQ',
  'Queen - Bohemian Rhapsody',
  'Uma das maiores obras-primas do rock. Freddie Mercury em sua melhor forma.',
  'Queen Official',
  354,
  'https://img.youtube.com/vi/fJ9rUzIMcZQ/maxresdefault.jpg',
  'en',
  (SELECT id FROM public.categories WHERE slug = 'musica'),
  true,
  1700000
WHERE NOT EXISTS (SELECT 1 FROM public.videos WHERE youtube_id = 'fJ9rUzIMcZQ');

INSERT INTO public.videos (youtube_id, title, description, channel_name, duration_seconds, thumbnail_url, language, category_id, is_featured, view_count)
SELECT 
  'OPf0YbXqDm0',
  'Mark Ronson - Uptown Funk ft. Bruno Mars',
  'O hit que dominou as paradas em 2015.',
  'Mark Ronson',
  271,
  'https://img.youtube.com/vi/OPf0YbXqDm0/maxresdefault.jpg',
  'en',
  (SELECT id FROM public.categories WHERE slug = 'musica'),
  false,
  4500000
WHERE NOT EXISTS (SELECT 1 FROM public.videos WHERE youtube_id = 'OPf0YbXqDm0');

INSERT INTO public.videos (youtube_id, title, description, channel_name, duration_seconds, thumbnail_url, language, category_id, is_featured, view_count)
SELECT 
  'M7lc1UVf-VE',
  'YouTube Rewind 2018',
  'O vídeo mais descurtido da história do YouTube. Um marco cultural.',
  'YouTube',
  508,
  'https://img.youtube.com/vi/M7lc1UVf-VE/maxresdefault.jpg',
  'en',
  (SELECT id FROM public.categories WHERE slug = 'cultura'),
  false,
  2100000
WHERE NOT EXISTS (SELECT 1 FROM public.videos WHERE youtube_id = 'M7lc1UVf-VE');
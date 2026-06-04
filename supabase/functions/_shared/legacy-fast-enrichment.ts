export type LegacyFastCategory = {
  id: string;
  name: string;
  slug: string;
};

export function normalizeLanguage(value: string | null | undefined): string {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized.length >= 2 ? normalized.slice(0, 12) : 'pt';
}

export function normalizeText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function summarize(value: string | null | undefined, fallback: string) {
  const normalized = (value ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) return fallback;
  return normalized.length > 420 ? `${normalized.slice(0, 417).trim()}...` : normalized;
}

export function buildVideoSummary(params: {
  title: string | null;
  description: string | null;
  channelName: string | null;
  youtubeId: string;
}) {
  const description = summarize(params.description, '');
  if (description) return description;

  const title = params.title?.trim() || 'video do YouTube';
  const channel = params.channelName?.trim();
  return channel
    ? `Video do canal ${channel} sobre "${title}", enviado para curadoria Tube O2.`
    : `Video sobre "${title}", enviado para curadoria Tube O2 a partir do YouTube (${params.youtubeId}).`;
}

export function deriveTags(params: {
  title: string | null;
  description: string | null;
  channelName: string | null;
  language: string;
}) {
  const source = `${params.title ?? ''} ${params.description ?? ''} ${params.channelName ?? ''}`.toLowerCase();
  const tags = new Set<string>(['youtube', 'curadoria', params.language]);
  const signals: Array<[string, string[]]> = [
    ['matematica', ['matem', 'calculo', 'algebra', 'equacao', 'estatistica']],
    ['programacao', ['programa', 'javascript', 'python', 'codigo', 'software']],
    ['design', ['design', 'visual', 'grafico', 'tipografia']],
    ['dados', ['sql', 'database', 'dados', 'banco de dados']],
    ['educacao', ['aula', 'curso', 'aprenda', 'tutorial', 'facodi']],
  ];

  for (const [tag, keywords] of signals) {
    if (keywords.some((keyword) => source.includes(keyword))) tags.add(tag);
  }

  return [...tags].slice(0, 8);
}

function scoreCategory(category: LegacyFastCategory, source: string, semanticTags: string[]) {
  const slug = normalizeText(category.slug);
  const name = normalizeText(category.name);
  const tagsText = semanticTags.map(normalizeText).join(' ');
  let score = 0;

  if (source.includes(slug) || source.includes(name)) score += 10;
  if (tagsText.includes(slug) || tagsText.includes(name)) score += 8;

  const keywordMap: Record<string, string[]> = {
    cultura: ['cultura', 'historia', 'sociedade', 'arte', 'tradicao', 'antropologia'],
    educacao: ['educacao', 'aula', 'curso', 'aprenda', 'tutorial', 'ensino', 'estudo', 'facodi', 'universidade', 'escola'],
    'memes-iconicos': ['meme', 'memes', 'viral', 'humor', 'engracado'],
    musica: ['musica', 'music', 'audio', 'som', 'cantor', 'banda', 'instrumento'],
    tech: ['tech', 'tecnologia', 'programacao', 'programa', 'codigo', 'software', 'javascript', 'python', 'sql', 'database', 'dados', 'ia', 'inteligencia artificial'],
    'tutoriais-antigos': ['tutorial', 'como fazer', 'passo a passo', 'guia', 'dica', 'aprenda'],
    receitas: ['receita', 'receitas', 'cozinha', 'culinaria', 'comida', 'bolo', 'prato'],
    'receitas-tradicionais': ['receita', 'receitas', 'cozinha', 'culinaria', 'comida', 'bolo', 'prato'],
  };

  const keywords = [
    ...(keywordMap[slug] ?? []),
    ...(slug === 'tech' ? keywordMap.tecnologia ?? [] : []),
  ];

  const sourceTokens = new Set(source.split(/[^a-z0-9]+/).filter(Boolean));
  for (const keyword of keywords) {
    const normalizedKeyword = normalizeText(keyword);
    const matches = normalizedKeyword.length <= 2
      ? sourceTokens.has(normalizedKeyword)
      : source.includes(normalizedKeyword);
    if (matches) score += 3;
  }

  return score;
}

export function pickCategory(categories: LegacyFastCategory[], params: {
  currentCategoryId: string | null;
  title: string | null;
  description: string | null;
  channelName: string | null;
  semanticTags: string[];
}) {
  const currentCategory = categories.find((category) => category.id === params.currentCategoryId) ?? null;
  const unclassifiedCategory = categories.find((category) => normalizeText(category.slug) === 'nao-classificados') ?? null;
  if (currentCategory && currentCategory.id !== unclassifiedCategory?.id) return currentCategory;

  const source = normalizeText([
    params.title,
    params.description,
    params.channelName,
    params.semanticTags.join(' '),
  ].filter(Boolean).join(' '));

  let best: { category: LegacyFastCategory | null; score: number } = { category: null, score: 0 };
  for (const category of categories) {
    if (category.id === unclassifiedCategory?.id) continue;
    const score = scoreCategory(category, source, params.semanticTags);
    if (score > best.score) best = { category, score };
  }

  if (best.category && best.score >= 3) return best.category;

  return categories.find((category) => normalizeText(category.slug) === 'educacao')
    ?? unclassifiedCategory
    ?? categories[0]
    ?? null;
}

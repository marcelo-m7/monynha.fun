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
  const tags = new Set<string>();
  const signals: Array<[string, string[]]> = [
    ['matemática', ['matem', 'calculo', 'cálculo', 'algebra', 'álgebra', 'equacao', 'equação', 'estatistica', 'estatística', 'integral', 'derivada']],
    ['programação', ['programa', 'javascript', 'typescript', 'python', 'codigo', 'código', 'software', 'react', 'node', 'fastapi']],
    ['história da arte', ['historia da arte', 'história da arte', 'arte', 'artes visuais', 'pintura', 'renascimento', 'barroco', 'maneirismo', 'gótico', 'gotico', 'bizantina', 'rupestre', 'paleocristã', 'paleocrista', 'românica', 'romanica', 'arte grega', 'arte romana', 'arte egípcia', 'arte egipcia']],
    ['design', ['design', 'visual', 'grafico', 'gráfico', 'tipografia', 'indesign', 'composição visual']],
    ['banco de dados', ['sql', 'database', 'dados', 'banco de dados', 'base de dados', 'normalização', 'normalizacao']],
    ['Odoo', ['odoo', 'erp', 'human resources', 'employees', 'expenses', 'fleet', 'time off']],
    ['educação', ['aula', 'curso', 'aprenda', 'tutorial', 'facodi', 'ensino']],
    ['receitas', ['receita', 'receitas', 'culinaria', 'cozinha', 'gastronomia', 'sopa', 'cebola', 'chef', 'ingredientes', 'forno', 'assado', 'sobremesa']],
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
    matematica: ['matematica', 'calculo', 'integral', 'derivada', 'algebra', 'equacao', 'vetorial', 'coordenadas', 'estatistica'],
    design: ['design', 'tipografia', 'grafico', 'comunicacao visual', 'indesign', 'composicao visual', 'ilustracao'],
    'historia-da-arte': ['historia da arte', 'arte', 'artes visuais', 'pintura', 'renascimento', 'barroco', 'maneirismo', 'gotico', 'bizantina', 'rupestre', 'paleocrista', 'romanica', 'arte grega', 'arte romana', 'arte egipcia'],
    'memes-iconicos': ['meme', 'memes', 'viral', 'humor', 'engracado'],
    musica: ['musica', 'music', 'audio', 'som', 'cantor', 'banda', 'instrumento'],
    tech: ['tech', 'tecnologia', 'programacao', 'programa', 'codigo', 'software', 'javascript', 'typescript', 'python', 'sql', 'database', 'dados', 'ia', 'inteligencia artificial', 'odoo', 'erp', 'supabase', 'linux'],
    'tutoriais-antigos': ['tutorial', 'como fazer', 'passo a passo', 'guia', 'dica', 'aprenda'],
    receitas: ['receita', 'receitas', 'cozinha', 'culinaria', 'comida', 'bolo', 'prato'],
    'receitas-tradicionais': [
      'receita',
      'receitas',
      'cozinha',
      'culinaria',
      'comida',
      'bolo',
      'prato',
      'sopa',
      'cebola',
      'gastronomia',
      'chef',
      'ingredientes',
      'forno',
      'sobremesa',
      'molho',
      'assado',
    ],
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
  const genericCategorySlugs = new Set(['nao-classificados', 'educacao']);
  if (currentCategory && !genericCategorySlugs.has(normalizeText(currentCategory.slug))) return currentCategory;

  const source = normalizeText([
    params.title,
    params.description,
    params.channelName,
    params.semanticTags.join(' '),
  ].filter(Boolean).join(' '));

  const hasRecipeSignals =
    params.semanticTags.some((tag) => normalizeText(tag) === 'receitas') ||
    [
      'receita',
      'receitas',
      'culinaria',
      'cozinha',
      'sopa',
      'cebola',
      'gastronomia',
      'chef',
      'ingredientes',
      'forno',
      'assado',
    ].some((keyword) => source.includes(keyword));

  if (hasRecipeSignals) {
    const recipeCategory = categories.find((category) => {
      const slug = normalizeText(category.slug);
      return slug === 'receitas-tradicionais' || slug === 'receitas';
    });
    if (recipeCategory) return recipeCategory;
  }

  if (params.semanticTags.some((tag) => normalizeText(tag) === 'historia da arte')) {
    const designCategory = categories.find((category) => normalizeText(category.slug) === 'design');
    const cultureCategory = categories.find((category) => normalizeText(category.slug) === 'cultura');
    if (designCategory) return designCategory;
    if (cultureCategory) return cultureCategory;
  }

  let best: { category: LegacyFastCategory | null; score: number } = { category: null, score: 0 };
  for (const category of categories) {
    if (category.id === unclassifiedCategory?.id) continue;
    const score = scoreCategory(category, source, params.semanticTags);
    if (score > best.score) best = { category, score };
  }

  if (best.category && best.score >= 6) return best.category;

  return categories.find((category) => normalizeText(category.slug) === 'educacao')
    ?? unclassifiedCategory
    ?? categories[0]
    ?? null;
}

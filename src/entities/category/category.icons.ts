import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  ChefHat,
  Code,
  Cpu,
  Film,
  Globe,
  GraduationCap,
  HelpCircle,
  Laugh,
  Music,
  Palette,
  Utensils,
} from 'lucide-react';
import type { Category } from './category.types';

export const CATEGORY_ICON_BY_SLUG: Record<string, LucideIcon> = {
  cultura: Globe,
  educacao: GraduationCap,
  tech: Cpu,
  tecnologia: Cpu,
  'memes-iconicos': Laugh,
  musica: Music,
  'tutoriais-antigos': BookOpen,
  tutoriais: BookOpen,
  receitas: ChefHat,
  'receitas-tradicionais': Utensils,
  'nao-classificados': HelpCircle,
};

export const CATEGORY_ICON_BY_NAME: Record<string, LucideIcon> = {
  BookOpen,
  ChefHat,
  Code,
  Cpu,
  Film,
  Globe,
  GraduationCap,
  HelpCircle,
  Laugh,
  Music,
  Palette,
  Utensils,
};

export const resolveCategoryIcon = (category: Pick<Category, 'slug' | 'icon'>): LucideIcon => {
  const slug = category.slug?.trim().toLowerCase();
  if (slug && CATEGORY_ICON_BY_SLUG[slug]) {
    return CATEGORY_ICON_BY_SLUG[slug];
  }

  const iconName = category.icon?.trim();
  if (iconName && CATEGORY_ICON_BY_NAME[iconName]) {
    return CATEGORY_ICON_BY_NAME[iconName];
  }

  return HelpCircle;
};

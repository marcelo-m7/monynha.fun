import { BookOpen, Cpu, HelpCircle } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { resolveCategoryIcon } from './category.icons';
import type { Category } from './category.types';

type CategoryIconInput = Pick<Category, 'slug' | 'icon'>;

describe('resolveCategoryIcon', () => {
  it('uses the category slug before the legacy icon field', () => {
    const icon = resolveCategoryIcon({ slug: 'tech', icon: 'BookOpen' } as CategoryIconInput);

    expect(icon).toBe(Cpu);
  });

  it('keeps legacy icon names working when the slug is unknown', () => {
    const icon = resolveCategoryIcon({ slug: 'frontend', icon: 'BookOpen' } as CategoryIconInput);

    expect(icon).toBe(BookOpen);
  });

  it('falls back to HelpCircle for unknown category icon data', () => {
    const icon = resolveCategoryIcon({ slug: 'mystery', icon: 'NotARealIcon' } as CategoryIconInput);

    expect(icon).toBe(HelpCircle);
  });
});

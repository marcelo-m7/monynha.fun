import { supabase } from '@/integrations/supabase/client';
import type { Category } from '../types/Category';
import type { CategoryRepository } from './CategoryRepository';

export const supabaseCategoryRepository: CategoryRepository = {
  async listCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) throw error;
    return data as Category[];
  },
};

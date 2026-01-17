import { useQuery } from '@tanstack/react-query';
import { supabaseCategoryRepository } from '../infrastructure/SupabaseCategoryRepository';
import { fetchCategories } from '../useCases/fetchCategories';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => fetchCategories(supabaseCategoryRepository),
  });
}

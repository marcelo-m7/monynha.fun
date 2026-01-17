import { useQuery } from '@tanstack/react-query';
import { listCategories } from '@/entities/category/category.api';
import { categoryKeys } from '@/entities/category/category.keys';
import type { Category } from '@/entities/category/category.types';

export function useCategories() {
  return useQuery<Category[], Error>({
    queryKey: categoryKeys.list(),
    queryFn: () => listCategories(),
  });
}

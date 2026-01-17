import type { Category } from '../types/Category';

export interface CategoryRepository {
  listCategories(): Promise<Category[]>;
}

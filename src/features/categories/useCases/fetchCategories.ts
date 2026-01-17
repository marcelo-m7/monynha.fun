import type { Category } from '../types/Category';
import type { CategoryRepository } from '../infrastructure/CategoryRepository';

export async function fetchCategories(repository: CategoryRepository): Promise<Category[]> {
  return repository.listCategories();
}

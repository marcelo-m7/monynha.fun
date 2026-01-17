import { supabase } from '@/shared/api/supabase/supabaseClient';
import type { Category } from './category.types';

export async function listCategories() {
  const { data, error } = await supabase.from('categories').select('*').order('name');
  if (error) throw error;
  return data as Category[];
}

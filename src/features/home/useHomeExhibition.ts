import { useQuery } from '@tanstack/react-query';
import { getHomeExhibition } from '@/entities/home/home.api';
import { homeKeys } from '@/entities/home/home.keys';
import type { HomeExhibition } from '@/entities/home/home.types';

export function useHomeExhibition() {
  return useQuery<HomeExhibition, Error>({
    queryKey: homeKeys.exhibition(),
    queryFn: getHomeExhibition,
  });
}

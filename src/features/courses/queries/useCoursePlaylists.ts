import { useQuery } from '@tanstack/react-query';
import {
  listCoursePlaylistCatalog,
  listCoursePlaylistSummary,
} from '@/entities/course/course.api';
import { courseKeys } from '@/entities/course/course.keys';
import type {
  CoursePlaylistCatalogItem,
  CoursePlaylistSummaryItem,
} from '@/entities/course/course.types';

interface UseCourseCatalogOptions {
  courseCode?: string;
  enabled?: boolean;
}

export function useCoursePlaylistSummary(enabled = true) {
  return useQuery<CoursePlaylistSummaryItem[], Error>({
    queryKey: courseKeys.summaryList(),
    queryFn: listCoursePlaylistSummary,
    enabled,
  });
}

export function useCoursePlaylistCatalog(options: UseCourseCatalogOptions = {}) {
  const { courseCode, enabled = true } = options;

  return useQuery<CoursePlaylistCatalogItem[], Error>({
    queryKey: courseKeys.catalogList({ courseCode }),
    queryFn: () => listCoursePlaylistCatalog({ courseCode }),
    enabled,
  });
}

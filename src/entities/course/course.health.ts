import type {
  CoursePlaylistSummaryItem,
  FacodiPlaylistHealthGroup,
  FacodiPlaylistHealthItem,
  FacodiPlaylistHealthStatus,
} from './course.types';

const HEALTH_STATUS_ORDER: Record<FacodiPlaylistHealthStatus, number> = {
  empty: 0,
  thin: 1,
  overloaded: 2,
  healthy: 3,
};

export function pickDefaultFacodiCourseCode(summaries: CoursePlaylistSummaryItem[]) {
  const lesti = summaries.find((summary) => summary.course_code === 'LESTI');
  return lesti?.course_code ?? summaries[0]?.course_code ?? '';
}

export function summarizeFacodiPlaylistHealth(items: FacodiPlaylistHealthItem[]) {
  return items.reduce(
    (summary, item) => {
      summary[item.health_status] += 1;
      summary.videos += item.video_count;
      summary.durationSeconds += item.total_duration_seconds;
      return summary;
    },
    {
      empty: 0,
      thin: 0,
      healthy: 0,
      overloaded: 0,
      videos: 0,
      durationSeconds: 0,
    },
  );
}

export function groupFacodiPlaylistHealthBySemester(
  items: FacodiPlaylistHealthItem[],
  fallbackSemesterLabel: string,
): FacodiPlaylistHealthGroup[] {
  const groups = new Map<string, FacodiPlaylistHealthItem[]>();

  for (const item of items) {
    const semesterLabel = item.semester_label?.trim() || fallbackSemesterLabel;
    const group = groups.get(semesterLabel) ?? [];
    group.push(item);
    groups.set(semesterLabel, group);
  }

  return Array.from(groups.entries())
    .map(([semesterLabel, groupItems]) => {
      const sortedItems = [...groupItems].sort((left, right) => {
        const priorityDiff = left.priority_rank - right.priority_rank;
        if (priorityDiff !== 0) return priorityDiff;

        const statusDiff = HEALTH_STATUS_ORDER[left.health_status] - HEALTH_STATUS_ORDER[right.health_status];
        if (statusDiff !== 0) return statusDiff;

        return (left.unit_code ?? left.playlist_name).localeCompare(right.unit_code ?? right.playlist_name, 'pt');
      });

      return {
        semesterLabel,
        items: sortedItems,
        videoCount: sortedItems.reduce((total, item) => total + item.video_count, 0),
        durationSeconds: sortedItems.reduce((total, item) => total + item.total_duration_seconds, 0),
      };
    })
    .sort((left, right) => {
      const leftPriority = Math.min(...left.items.map((item) => item.priority_rank));
      const rightPriority = Math.min(...right.items.map((item) => item.priority_rank));
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;

      return left.semesterLabel.localeCompare(right.semesterLabel, 'pt', { numeric: true });
    });
}

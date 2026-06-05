import { describe, expect, it } from 'vitest';
import {
  groupFacodiPlaylistHealthBySemester,
  pickDefaultFacodiCourseCode,
  summarizeFacodiPlaylistHealth,
} from './course.health';
import type { CoursePlaylistSummaryItem, FacodiPlaylistHealthItem } from './course.types';

let itemId = 0;

const makeHealthItem = (overrides: Partial<FacodiPlaylistHealthItem>): FacodiPlaylistHealthItem => ({
  playlist_id: overrides.playlist_id ?? `playlist-${itemId++}`,
  course_code: overrides.course_code ?? 'LESTI',
  course_name: overrides.course_name ?? 'Engenharia de Sistemas e Tecnologias Informaticas',
  unit_code: overrides.unit_code ?? null,
  playlist_name: overrides.playlist_name ?? 'Playlist',
  playlist_slug: overrides.playlist_slug ?? 'playlist',
  playlist_description: null,
  language: 'pt',
  is_public: true,
  is_ordered: false,
  video_count: overrides.video_count ?? 0,
  total_duration_seconds: overrides.total_duration_seconds ?? 0,
  thumbnail_url: null,
  semester_label: overrides.semester_label ?? null,
  video_range: 'empty',
  collaborators_count: 0,
  playlist_videos_rows: 0,
  health_status: overrides.health_status ?? 'empty',
  priority_rank: overrides.priority_rank ?? 10,
  priority_reason: overrides.priority_reason ?? 'playlist_sem_videos',
  recommended_action: overrides.recommended_action ?? 'seed_initial_videos',
});

describe('FACODI playlist health helpers', () => {
  it('prefers LESTI as the default curricular focus when available', () => {
    const summaries = [
      { course_code: 'LDC', course_name: 'Design', playlists_total: 1 },
      { course_code: 'LESTI', course_name: 'Engenharia', playlists_total: 1 },
    ] as CoursePlaylistSummaryItem[];

    expect(pickDefaultFacodiCourseCode(summaries)).toBe('LESTI');
  });

  it('summarizes playlist health counters and media totals', () => {
    const summary = summarizeFacodiPlaylistHealth([
      makeHealthItem({ health_status: 'empty' }),
      makeHealthItem({ health_status: 'thin', video_count: 2, total_duration_seconds: 120 }),
      makeHealthItem({ health_status: 'overloaded', video_count: 55, total_duration_seconds: 3600 }),
    ]);

    expect(summary).toMatchObject({
      empty: 1,
      thin: 1,
      healthy: 0,
      overloaded: 1,
      videos: 57,
      durationSeconds: 3720,
    });
  });

  it('groups by semester and keeps the highest-priority LESTI gaps first', () => {
    const groups = groupFacodiPlaylistHealthBySemester(
      [
        makeHealthItem({
          unit_code: '19411008',
          playlist_name: 'Analise Matematica II',
          semester_label: '1.º Ano - 2.º Semestre',
          health_status: 'healthy',
          priority_rank: 60,
          video_count: 8,
        }),
        makeHealthItem({
          unit_code: '19411005',
          playlist_name: 'Algoritmia',
          semester_label: '1.º Ano - 1.º Semestre',
          health_status: 'empty',
          priority_rank: 10,
        }),
      ],
      'Semestre por organizar',
    );

    expect(groups[0]?.semesterLabel).toBe('1.º Ano - 1.º Semestre');
    expect(groups[0]?.items[0]?.unit_code).toBe('19411005');
    expect(groups[1]?.videoCount).toBe(8);
  });
});

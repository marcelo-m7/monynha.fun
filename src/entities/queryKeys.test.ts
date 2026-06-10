import { describe, expect, it } from 'vitest';
import { videoKeys } from './video/video.keys';
import { playlistKeys } from './playlist/playlist.keys';
import { profileKeys } from './profile/profile.keys';
import { categoryKeys } from './category/category.keys';
import { videoSubmissionKeys } from './video_submission/video_submission.keys';
import { videoAnalysisJobKeys } from './video_analysis_job/video_analysis_job.keys';
import { courseKeys } from './course/course.keys';
import { modulePublicationKeys } from './module_publication/module_publication.keys';

describe('query key factories', () => {
  it('creates stable video keys', () => {
    const params = { searchQuery: 'react', limit: 4, categoryId: 'cat-1' };
    expect(videoKeys.list(params)).toEqual(videoKeys.list({ ...params }));
    expect(videoKeys.detail('video-1')).toEqual(['videos', 'detail', 'video-1']);
  });

  it('creates stable playlist keys', () => {
    const params = { authorId: 'author-1', filter: 'my' as const };
    expect(playlistKeys.list(params)).toEqual(playlistKeys.list({ ...params }));
    expect(playlistKeys.detail('playlist-1')).toEqual(['playlists', 'detail', 'playlist-1']);
  });

  it('creates stable profile and category keys', () => {
    expect(profileKeys.detail('user-1')).toEqual(['profiles', 'detail', 'user-1']);
    expect(profileKeys.byUsername('jane')).toEqual(['profiles', 'by-username', 'jane']);
    expect(categoryKeys.list()).toEqual(['categories', 'list']);
  });

  it('creates stable video submission keys', () => {
    expect(videoSubmissionKeys.detail('submission-1')).toEqual([
      'video-submissions',
      'detail',
      'submission-1',
    ]);
  });

  it('creates stable video analysis job keys', () => {
    expect(videoAnalysisJobKeys.byVideo('video-1')).toEqual([
      'video-analysis-jobs',
      'by-video',
      'video-1',
    ]);
    expect(videoAnalysisJobKeys.list({ status: 'pending', limit: 10 })).toEqual([
      'video-analysis-jobs',
      'list',
      { status: 'pending', limit: 10 },
    ]);
  });

  it('creates stable course health keys', () => {
    expect(courseKeys.healthList({ courseCode: 'LESTI' })).toEqual([
      'courses',
      'health',
      { courseCode: 'LESTI' },
    ]);
    expect(courseKeys.healthList()).toEqual(['courses', 'health', { courseCode: '' }]);
  });

  it('creates stable module publication keys', () => {
    expect(modulePublicationKeys.enqueue()).toEqual(['module-publications', 'enqueue']);
    expect(modulePublicationKeys.candidatesList({ search: 'historia', limit: 12 })).toEqual([
      'module-publications',
      'candidates-list',
      { search: 'historia', limit: 12 },
    ]);
    expect(modulePublicationKeys.detail('job-1')).toEqual([
      'module-publications',
      'detail',
      'job-1',
    ]);
    expect(modulePublicationKeys.byModule('module-1', 5)).toEqual([
      'module-publications',
      'status-list',
      { moduleId: 'module-1', jobId: '', limit: 5 },
    ]);
    expect(modulePublicationKeys.byJob('job-1')).toEqual([
      'module-publications',
      'status-list',
      { moduleId: '', jobId: 'job-1', limit: 1 },
    ]);
  });
});

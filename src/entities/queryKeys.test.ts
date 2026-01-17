import { describe, expect, it } from 'vitest';
import { videoKeys } from './video/video.keys';
import { playlistKeys } from './playlist/playlist.keys';
import { profileKeys } from './profile/profile.keys';
import { categoryKeys } from './category/category.keys';

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
});

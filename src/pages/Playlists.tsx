import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { usePlaylists } from '@/features/playlists/queries/usePlaylists';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, ListVideo, Search, Filter, Youtube, X, BookOpen, Layers3, FileVideo } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useEffect, useMemo, useState } from 'react';
import { PlaylistCard } from '@/components/playlist/PlaylistCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/features/auth/useAuth';
import { PlaylistImportDialog } from '@/components/playlist/PlaylistImportDialog';
import { useCoursePlaylistSummary } from '@/features/courses/queries/useCoursePlaylists';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function extractSemesterLabel(name: string): string | null {
  const match = name.match(/(\d+[ºo]\s*Ano\s*\d+[ºo]\s*Semestre)/i);
  if (!match) return null;
  return match[1]
    .replace(/o/gi, 'º')
    .replace(/\s+/g, ' ')
    .trim();
}

const Playlists = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const initialSearchQuery = searchParams.get('query') || '';
  const initialFilter = (searchParams.get('scope') as 'all' | 'my' | 'collaborating') || 'all';
  const initialCourseCode = searchParams.get('course') || '';
  const initialSemester = searchParams.get('semester') || '';
  const initialLanguage = searchParams.get('language') || '';
  const initialPlaylistType = (searchParams.get('type') as 'all' | 'learningPath' | 'collection') || 'all';
  const initialVideoRange = (searchParams.get('videos') as 'all' | 'empty' | 'withVideos' | '1to9' | '10plus') || 'all';

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [filter, setFilter] = useState<'all' | 'my' | 'collaborating'>(initialFilter);
  const [selectedCourseCode, setSelectedCourseCode] = useState(initialCourseCode);
  const [selectedSemester, setSelectedSemester] = useState(initialSemester);
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);
  const [selectedPlaylistType, setSelectedPlaylistType] = useState<'all' | 'learningPath' | 'collection'>(initialPlaylistType);
  const [selectedVideoRange, setSelectedVideoRange] = useState<'all' | 'empty' | 'withVideos' | '1to9' | '10plus'>(initialVideoRange);

  const { data: playlists, isLoading, isError } = usePlaylists({
    searchQuery: searchQuery || undefined,
    filter: filter,
    enabled: filter !== 'my' || !!user, // Only enable 'my' filter if user is logged in
  });
  const { data: courseSummary, isLoading: isCourseSummaryLoading } = useCoursePlaylistSummary();

  useEffect(() => {
    const newSearchParams = new URLSearchParams();

    if (searchQuery) newSearchParams.set('query', searchQuery);
    if (filter !== 'all') newSearchParams.set('scope', filter);
    if (selectedCourseCode) newSearchParams.set('course', selectedCourseCode);
    if (selectedSemester) newSearchParams.set('semester', selectedSemester);
    if (selectedLanguage) newSearchParams.set('language', selectedLanguage);
    if (selectedPlaylistType !== 'all') newSearchParams.set('type', selectedPlaylistType);
    if (selectedVideoRange !== 'all') newSearchParams.set('videos', selectedVideoRange);

    setSearchParams(newSearchParams);
  }, [
    searchQuery,
    filter,
    selectedCourseCode,
    selectedSemester,
    selectedLanguage,
    selectedPlaylistType,
    selectedVideoRange,
    setSearchParams,
  ]);

  const courseCodeOptions = useMemo(() => {
    const values = new Set<string>();
    (courseSummary || []).forEach((course) => {
      values.add(course.course_code);
    });

    // Fallback for local/dev states when summary view has no rows.
    if (values.size === 0) {
      (playlists || []).forEach((playlist) => {
        if (playlist.course_code) values.add(playlist.course_code);
      });
    }

    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [courseSummary, playlists]);

  const semesterOptions = useMemo(() => {
    const values = new Set<string>();
    (playlists || []).forEach((playlist) => {
      const semester = extractSemesterLabel(playlist.name);
      if (semester) values.add(semester);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [playlists]);

  const languageOptions = useMemo(() => {
    const values = new Set<string>();
    (playlists || []).forEach((playlist) => {
      if (playlist.language) values.add(playlist.language);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [playlists]);

  const filteredPlaylists = useMemo(() => {
    return (playlists || []).filter((playlist) => {
      if (selectedCourseCode && playlist.course_code !== selectedCourseCode) return false;

      if (selectedSemester) {
        const semester = extractSemesterLabel(playlist.name);
        if (semester !== selectedSemester) return false;
      }

      if (selectedLanguage && playlist.language !== selectedLanguage) return false;

      if (selectedPlaylistType === 'learningPath' && !playlist.is_ordered) return false;
      if (selectedPlaylistType === 'collection' && playlist.is_ordered) return false;

      const videoCount = playlist.video_count ?? 0;
      if (selectedVideoRange === 'empty' && videoCount !== 0) return false;
      if (selectedVideoRange === 'withVideos' && videoCount <= 0) return false;
      if (selectedVideoRange === '1to9' && (videoCount < 1 || videoCount > 9)) return false;
      if (selectedVideoRange === '10plus' && videoCount < 10) return false;

      return true;
    });
  }, [playlists, selectedCourseCode, selectedSemester, selectedLanguage, selectedPlaylistType, selectedVideoRange]);

  const courseSummaryCards = useMemo(() => {
    return (courseSummary || []).filter((course) => course.playlists_total > 0);
  }, [courseSummary]);

  const hasAdvancedFilters =
    !!selectedCourseCode ||
    !!selectedSemester ||
    !!selectedLanguage ||
    selectedPlaylistType !== 'all' ||
    selectedVideoRange !== 'all';

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];

    if (searchQuery) {
      chips.push({
        key: 'query',
        label: searchQuery,
        onRemove: () => setSearchQuery(''),
      });
    }

    if (selectedCourseCode) {
      chips.push({
        key: 'course',
        label: selectedCourseCode,
        onRemove: () => setSelectedCourseCode(''),
      });
    }

    if (selectedSemester) {
      chips.push({
        key: 'semester',
        label: selectedSemester,
        onRemove: () => setSelectedSemester(''),
      });
    }

    if (selectedLanguage) {
      chips.push({
        key: 'language',
        label: t(`common.language.${selectedLanguage}`, { defaultValue: selectedLanguage.toUpperCase() }),
        onRemove: () => setSelectedLanguage(''),
      });
    }

    if (selectedPlaylistType !== 'all') {
      chips.push({
        key: 'type',
        label: selectedPlaylistType === 'learningPath' ? t('playlists.learningPath') : t('playlists.collection'),
        onRemove: () => setSelectedPlaylistType('all'),
      });
    }

    if (selectedVideoRange !== 'all') {
      const videoRangeLabelMap: Record<typeof selectedVideoRange, string> = {
        all: t('playlists.filter.allVideoRanges'),
        empty: t('playlists.filter.emptyVideos'),
        withVideos: t('playlists.filter.withVideos'),
        '1to9': t('playlists.filter.videos1to9'),
        '10plus': t('playlists.filter.videos10plus'),
      };

      chips.push({
        key: 'videos',
        label: videoRangeLabelMap[selectedVideoRange],
        onRemove: () => setSelectedVideoRange('all'),
      });
    }

    if (filter !== 'all') {
      const scopeLabelMap: Record<typeof filter, string> = {
        all: t('playlists.filter.all'),
        my: t('playlists.filter.myPlaylists'),
        collaborating: t('playlists.filter.collaborating'),
      };

      chips.push({
        key: 'scope',
        label: scopeLabelMap[filter],
        onRemove: () => setFilter('all'),
      });
    }

    return chips;
  }, [
    searchQuery,
    selectedCourseCode,
    selectedSemester,
    selectedLanguage,
    selectedPlaylistType,
    selectedVideoRange,
    filter,
    t,
  ]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilter('all');
    setSelectedCourseCode('');
    setSelectedSemester('');
    setSelectedLanguage('');
    setSelectedPlaylistType('all');
    setSelectedVideoRange('all');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <Skeleton className="h-10 w-48" />
            <div className="flex gap-2 w-full md:w-auto">
              <Skeleton className="h-10 flex-1 md:w-64" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">{t('playlists.loadingErrorTitle')}</h1>
          <p className="text-muted-foreground mb-8">
            {t('playlists.loadingErrorDescription')}
          </p>
          <Button onClick={() => navigate('/')}>{t('common.backToHome')}</Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t('playlists.title')}</h1>
            <p className="text-muted-foreground mt-2">{t('playlists.description')}</p>
          </div>
          <div className="w-full md:flex-1 md:max-w-5xl space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2">
              <div className="relative sm:col-span-2 lg:col-span-3 xl:col-span-2 2xl:col-span-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t('playlists.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 h-10 bg-muted/50 border-0 focus-visible:ring-primary/30"
                />
              </div>
              <Select value={selectedCourseCode || 'all'} onValueChange={(value) => setSelectedCourseCode(value === 'all' ? '' : value)}>
                <SelectTrigger className="w-full bg-muted/50 border-0 focus:ring-primary/30">
                  <SelectValue placeholder={t('playlists.filter.allCourseCodes')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('playlists.filter.allCourseCodes')}</SelectItem>
                  {courseCodeOptions.map((courseCode) => (
                    <SelectItem key={courseCode} value={courseCode}>
                      {courseCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedSemester || 'all'} onValueChange={(value) => setSelectedSemester(value === 'all' ? '' : value)}>
                <SelectTrigger className="w-full bg-muted/50 border-0 focus:ring-primary/30">
                  <SelectValue placeholder={t('playlists.filter.allSemesters')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('playlists.filter.allSemesters')}</SelectItem>
                  {semesterOptions.map((semester) => (
                    <SelectItem key={semester} value={semester}>
                      {semester}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedLanguage || 'all'} onValueChange={(value) => setSelectedLanguage(value === 'all' ? '' : value)}>
                <SelectTrigger className="w-full bg-muted/50 border-0 focus:ring-primary/30">
                  <SelectValue placeholder={t('playlists.filter.allLanguages')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('playlists.filter.allLanguages')}</SelectItem>
                  {languageOptions.map((language) => (
                    <SelectItem key={language} value={language}>
                      {t(`common.language.${language}`, { defaultValue: language.toUpperCase() })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedPlaylistType} onValueChange={(value: 'all' | 'learningPath' | 'collection') => setSelectedPlaylistType(value)}>
                <SelectTrigger className="w-full bg-muted/50 border-0 focus:ring-primary/30">
                  <SelectValue placeholder={t('playlists.filter.allTypes')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('playlists.filter.allTypes')}</SelectItem>
                  <SelectItem value="learningPath">{t('playlists.learningPath')}</SelectItem>
                  <SelectItem value="collection">{t('playlists.collection')}</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={selectedVideoRange}
                onValueChange={(value: 'all' | 'empty' | 'withVideos' | '1to9' | '10plus') => setSelectedVideoRange(value)}
              >
                <SelectTrigger className="w-full bg-muted/50 border-0 focus:ring-primary/30">
                  <SelectValue placeholder={t('playlists.filter.allVideoRanges')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('playlists.filter.allVideoRanges')}</SelectItem>
                  <SelectItem value="withVideos">{t('playlists.filter.withVideos')}</SelectItem>
                  <SelectItem value="empty">{t('playlists.filter.emptyVideos')}</SelectItem>
                  <SelectItem value="1to9">{t('playlists.filter.videos1to9')}</SelectItem>
                  <SelectItem value="10plus">{t('playlists.filter.videos10plus')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filter} onValueChange={(value: 'all' | 'my' | 'collaborating') => setFilter(value)}>
                <SelectTrigger className="w-full bg-muted/50 border-0 focus:ring-primary/30">
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder={t('playlists.filter.all')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('playlists.filter.all')}</SelectItem>
                  {user && (
                    <>
                      <SelectItem value="my">{t('playlists.filter.myPlaylists')}</SelectItem>
                      <SelectItem value="collaborating">{t('playlists.filter.collaborating')}</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {activeFilterChips.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {activeFilterChips.map((chip) => (
                  <Button
                    key={chip.key}
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-8 gap-1 rounded-full"
                    onClick={chip.onRemove}
                  >
                    <span className="max-w-[210px] truncate">{chip.label}</span>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 md:justify-end">
              {(searchQuery || filter !== 'all' || hasAdvancedFilters) && (
                <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={handleClearFilters}>
                  <X className="w-4 h-4" />
                  {t('common.clear')}
                </Button>
              )}
              <PlaylistImportDialog>
                <Button variant="outline" className="gap-2 w-full sm:w-auto">
                  <Youtube className="w-4 h-4" />
                  {t('playlists.import.button')}
                </Button>
              </PlaylistImportDialog>
              <Button onClick={() => navigate('/playlists/new')} className="gap-2 w-full sm:w-auto">
                <Plus className="w-4 h-4" />
                {t('playlists.createPlaylist')}
              </Button>
            </div>
          </div>
        </div>

        {!isCourseSummaryLoading && courseSummaryCards.length > 0 && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {courseSummaryCards.map((course) => {
              const isActive = selectedCourseCode === course.course_code;

              return (
                <Card
                  key={course.course_code}
                  className={isActive ? 'border-primary ring-1 ring-primary/30' : ''}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{course.course_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{course.course_code}</p>
                      </div>
                      <Badge variant="outline">{course.playlists_total}</Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-md bg-muted/50 px-2 py-1.5">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>{t('playlists.learningPath')}</span>
                        </div>
                        <p className="text-sm font-semibold mt-1">{course.learning_paths_total}</p>
                      </div>
                      <div className="rounded-md bg-muted/50 px-2 py-1.5">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Layers3 className="h-3.5 w-3.5" />
                          <span>{t('playlists.collection')}</span>
                        </div>
                        <p className="text-sm font-semibold mt-1">{course.collections_total}</p>
                      </div>
                      <div className="rounded-md bg-muted/50 px-2 py-1.5">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <FileVideo className="h-3.5 w-3.5" />
                          <span>{t('header.videos')}</span>
                        </div>
                        <p className="text-sm font-semibold mt-1">{course.videos_total}</p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant={isActive ? 'default' : 'outline'}
                      className="w-full"
                      onClick={() => setSelectedCourseCode(isActive ? '' : course.course_code)}
                    >
                      {isActive ? t('common.clear') : course.course_code}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {filteredPlaylists.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlaylists.map((playlist, index) => (
              <PlaylistCard key={playlist.id} playlist={playlist} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <ListVideo className="w-16 h-16 mb-4 opacity-50 mx-auto" />
            <p className="text-lg font-medium mb-2">{t('playlists.noPlaylistsTitle')}</p>
            <p className="mb-6">{t('playlists.noPlaylistsDescription')}</p>
            <Button onClick={() => navigate('/playlists/new')}>{t('playlists.createFirstPlaylist')}</Button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Playlists;
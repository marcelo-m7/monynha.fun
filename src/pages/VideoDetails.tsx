import { useParams, useNavigate, Link } from 'react-router-dom';
import { useVideoById, useRelatedVideos } from '@/features/videos/queries/useVideos';
import { formatDuration, formatViewCount } from '@/shared/lib/format';
import { useAuth } from '@/features/auth/useAuth';
import { useIsFavorited, useAddFavorite, useRemoveFavorite } from '@/features/favorites/queries/useFavorites';
import { useProfileById } from '@/features/profile/queries/useProfile';
import { getYouTubeEmbedUrl } from '@/shared/lib/youtube';
import { useMetaTags } from '@/shared/hooks/useMetaTags';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { VideoCard } from '@/components/video/VideoCard';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge'; // Import Badge component
import { Card } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { CulturalRelevanceBadge } from '@/components/video/CulturalRelevanceBadge';
import { SemanticTagBadge } from '@/components/video/SemanticTagBadge';
import { Eye, Clock, Folder, ArrowLeft, Heart as HeartIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { CommentsSection } from '@/components/comment/CommentsSection'; // Import CommentsSection

const VideoDetails = () => {
  const { t } = useTranslation();
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: video, isLoading, isError } = useVideoById(videoId);
  const { data: profile } = useProfileById(video?.submitted_by);
  const { data: relatedVideos, isLoading: relatedLoading } = useRelatedVideos(
    video?.id || '', 
    video?.category_id || null
  );

  const { data: isFavorited, isLoading: isFavoritedLoading } = useIsFavorited(video?.id);
  const addFavoriteMutation = useAddFavorite();
  const removeFavoriteMutation = useRemoveFavorite();

  // Set dynamic meta tags for social media sharing
  useMetaTags({
    title: video?.title ? `${video.title} | Monynha Fun` : 'Monynha Fun',
    description: video?.description || 'Curadoria coletiva de vídeos do YouTube.',
    image: video?.thumbnail_url || 'https://monynha.com/opengraph-image-monynha-fun.png',
    type: 'video.other',
  });

  const handleFavoriteToggle = async () => {
    if (!user) {
      toast.info(t('videoDetails.favoriteInfo'), {
        action: {
          label: t('videoDetails.loginAction'),
          onClick: () => navigate('/auth'),
        },
      });
      return;
    }

    if (!video?.id) return;

    if (isFavorited) {
      await removeFavoriteMutation.mutateAsync(video.id);
    } else {
      await addFavoriteMutation.mutateAsync(video.id);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <Skeleton className="h-10 w-48 mb-6" /> {/* Added skeleton for back button */}
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="aspect-video w-full rounded-xl" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="lg:col-span-1 space-y-6">
              <h2 className="text-xl font-bold">{t('videoDetails.relatedVideosTitle')}</h2>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="w-24 h-16 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isError || !video) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">{t('videoDetails.videoNotFoundTitle')}</h1>
          <p className="text-muted-foreground mb-8">
            {t('videoDetails.videoNotFoundDescription')}
          </p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.backToHome')}
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)} // Navigates back to the previous page
          className="text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('common.back')}
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Video Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Player */}
            <AspectRatio ratio={16 / 9} className="bg-muted rounded-xl overflow-hidden shadow-lg">
              <iframe
                className="w-full h-full"
                src={getYouTubeEmbedUrl(video.youtube_id)}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </AspectRatio>

            {/* Video Info */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl md:text-3xl font-bold leading-tight">{video.title}</h1>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleFavoriteToggle}
                  disabled={isFavoritedLoading || addFavoriteMutation.isPending || removeFavoriteMutation.isPending}
                  className="text-muted-foreground hover:text-primary"
                >
                  {isFavoritedLoading || addFavoriteMutation.isPending || removeFavoriteMutation.isPending ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <HeartIcon className={`w-6 h-6 ${isFavorited ? 'fill-primary text-primary' : ''}`} />
                  )}
                </Button>
              </div>
              <p className="text-lg text-muted-foreground">{video.channel_name}</p>
              <p className="text-sm text-muted-foreground">
                {t('videoDetails.addedBy')}{' '}
                {profile?.username ? (
                  <Link to={`/profile/${profile.username}`} className="text-primary hover:underline">
                    @{profile.username}
                  </Link>
                ) : (
                  t('videoDetails.anonymousAuthor')
                )}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{formatViewCount(video.view_count)} {t('videoDetails.viewsLabel')}</span>
                </div>
                {video.duration_seconds && video.duration_seconds > 0 && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{formatDuration(video.duration_seconds)}</span>
                  </div>
                )}
                {video.category && (
                  <Badge 
                    variant="outline" 
                    className="text-sm px-2.5 py-1 flex items-center gap-1"
                    style={{ borderColor: video.category.color, color: video.category.color }}
                  >
                    <Folder className="w-3.5 h-3.5" />
                    {video.category.name}
                  </Badge>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="border-t border-border/50 pt-6 mt-6">
              <h2 className="text-xl font-bold mb-3">{t('videoDetails.descriptionTitle')}</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {video.description || t('videoDetails.noDescription')}
              </p>
            </div>

              {/* AI-Generated Summary */}
              {video.enrichment && (
                <Card className="p-6 bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200/50 dark:border-purple-800/50">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 p-2 flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">AI-Generated Summary</h3>
                        <CulturalRelevanceBadge relevance={video.enrichment.cultural_relevance} />
                      </div>
                    
                      {video.enrichment.short_summary && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {video.enrichment.short_summary}
                        </p>
                      )}
                    
                      {video.enrichment.summary_description && video.enrichment.summary_description !== video.enrichment.short_summary && (
                        <details className="group">
                          <summary className="text-sm text-primary cursor-pointer hover:underline">
                            Read full summary
                          </summary>
                          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                            {video.enrichment.summary_description}
                          </p>
                        </details>
                      )}
                    
                      {video.enrichment.semantic_tags && video.enrichment.semantic_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {video.enrichment.semantic_tags.map((tag, index) => (
                            <SemanticTagBadge key={`${tag}-${index}`} tag={tag} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )}

            {/* Comments Section */}
            {video.id && (
              <div className="border-t border-border/50 pt-6 mt-6">
                <CommentsSection videoId={video.id} />
              </div>
            )}
          </div>

          {/* Related Videos Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-xl font-bold">{t('videoDetails.relatedVideosTitle')}</h2>
            {relatedLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="w-24 h-16 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : relatedVideos && relatedVideos.length > 0 ? (
              <div className="space-y-4">
                {relatedVideos.map((relatedVideo) => (
                  <VideoCard 
                    key={relatedVideo.id} 
                    video={relatedVideo} 
                    variant="compact" 
                    onClick={() => navigate(`/videos/${relatedVideo.id}`)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">{t('videoDetails.noRelatedVideos')}</p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default VideoDetails;
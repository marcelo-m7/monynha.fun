import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useContributorCount } from '@/features/profile/queries/useProfile';
import { Skeleton } from '@/components/ui/skeleton';

const Community = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: contributorCount, isLoading: contributorCountLoading } = useContributorCount();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
          <h1 className="text-3xl font-bold">{t('community.title')}</h1>
          <p className="text-muted-foreground mt-2">{t('community.description')}</p>
        </div>
        
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-full bg-accent/10 text-accent">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{t('community.totalContributors')}</h2>
            {contributorCountLoading ? (
              <Skeleton className="h-6 w-24 mt-1" />
            ) : (
              <p className="text-muted-foreground text-lg">
                {t('community.contributorsCount', { count: contributorCount || 0 })}
              </p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Community;

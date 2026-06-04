import { MainLayout } from '@/components/layout/MainLayout';
import { PageHero } from '@/components/showcase';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Sparkles, User, Heart, Lightbulb, ShieldCheck, Handshake, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const About = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <MainLayout>
      <PageHero
        title={t('about.title')}
        description={t('about.description')}
        actions={
          <Button
            variant="ghost" 
            onClick={() => navigate('/')}
            className="justify-start px-0 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
        }
      />

      <div className="container py-12">
        <section className="space-y-12">
          {/* Our Mission */}
          <div className="bg-card border-2 border-border p-6 shadow-sm">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              {t('aboutPage.missionTitle')}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t('aboutPage.missionDescription')}
            </p>
          </div>

          {/* About the Founder */}
          <div className="bg-card border-2 border-border p-6 shadow-sm">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <User className="w-6 h-6 text-accent" />
              {t('aboutPage.founderTitle')}
            </h2>
            <div className="flex items-center gap-4 mb-4">
              <img 
                src="https://github.com/marcelo-m7.png" 
                alt="Marcelo Santos" 
                className="w-20 h-20 rounded-full border-2 border-primary" 
              />
              <div>
                <h3 className="text-xl font-semibold">{t('aboutPage.founderName')}</h3>
                <p className="text-muted-foreground text-sm">{t('aboutPage.founderRole')}</p>
              </div>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {t('aboutPage.founderDescription')}
            </p>
            <div className="mt-4 flex gap-4">
              <a 
                href="https://github.com/marcelo-m7" 
                target="_blank" 
                rel="noopener noreferrer" 
                 className="text-foreground underline hover:opacity-75 transition-opacity text-sm"
              >
                {t('aboutPage.githubLink')}
              </a>
              <a 
                href="https://marcelo.open2.tech" 
                target="_blank" 
                rel="noopener noreferrer" 
                 className="text-foreground underline hover:opacity-75 transition-opacity text-sm"
              >
                {t('aboutPage.websiteLink')}
              </a>
            </div>
          </div>

          {/* Values */}
          <div className="bg-card border-2 border-border p-6 shadow-sm">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Heart className="w-6 h-6 text-destructive" />
              {t('aboutPage.valuesTitle')}
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-muted-foreground">
              <li className="flex items-center gap-2"><Scale className="w-4 h-4 text-primary" /> {t('aboutPage.value1')}</li>
              <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> {t('aboutPage.value2')}</li>
              <li className="flex items-center gap-2"><Lightbulb className="w-4 h-4 text-primary" /> {t('aboutPage.value3')}</li>
              <li className="flex items-center gap-2"><Handshake className="w-4 h-4 text-primary" /> {t('aboutPage.value4')}</li>
              <li className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> {t('aboutPage.value5')}</li>
            </ul>
          </div>

          {/* Philosophy */}
          <div className="bg-card border-2 border-border p-6 shadow-sm">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Lightbulb className="w-6 h-6 text-primary" />
              {t('aboutPage.philosophyTitle')}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t('aboutPage.philosophyDescription')}
            </p>
          </div>
        </section>
      </div>
    </MainLayout>
  );
};

export default About;

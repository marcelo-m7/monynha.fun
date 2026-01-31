import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from 'react-i18next'; // Import useTranslation
import { Header } from '@/components/layout/Header'; // Added missing import
import { Footer } from '@/components/layout/Footer'; // Added missing import

const NotFound = () => {
  const { t } = useTranslation(); // Initialize useTranslation
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center bg-muted">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold">{t('notFound.title')}</h1>
          <p className="mb-4 text-xl text-muted-foreground">{t('notFound.description')}</p>
          <a href="/" className="text-primary underline hover:text-primary/90">
            {t('notFound.returnHome')}
          </a>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
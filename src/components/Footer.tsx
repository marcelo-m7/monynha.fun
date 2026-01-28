import { Github, Globe, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';

export const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border/50 bg-muted/30">
      <div className="container py-8 sm:py-10 lg:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-2 space-y-3 sm:space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg sm:rounded-xl bg-primary text-primary-foreground shadow-md">
                <span className="text-base sm:text-lg font-bold">M</span>
              </div>
              <span className="font-bold text-lg sm:text-xl tracking-tight">
                Monynha<span className="text-primary">Fun</span>
              </span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-sm">
              {t('footer.description')}
            </p>
          </div>

          {/* Links */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="font-semibold text-sm sm:text-base">{t('footer.navigation')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/videos" className="hover:text-primary transition-colors">{t('footer.categories')}</Link></li>
              <li><Link to="/videos?recent=true" className="hover:text-primary transition-colors">{t('footer.recent')}</Link></li>
              <li><Link to="/videos?featured=true" className="hover:text-primary transition-colors">{t('footer.featured')}</Link></li>
              <li><Link to="/submit" className="hover:text-primary transition-colors">{t('footer.submitVideo')}</Link></li>
            </ul>
          </div>

          {/* Community */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="font-semibold text-sm sm:text-base">{t('footer.community')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/community" className="hover:text-primary transition-colors">{t('footer.community')}</Link></li> {/* Added link to Community page */}
              <li><Link to="/about" className="hover:text-primary transition-colors">{t('footer.about')}</Link></li>
              <li><Link to="/rules" className="hover:text-primary transition-colors">{t('footer.rules')}</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">{t('footer.contact')}</Link></li>
              <li><Link to="/faq" className="hover:text-primary transition-colors">{t('footer.faq')}</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 pt-6 sm:pt-8 mt-6 sm:mt-8 border-t border-border/50">
          <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 text-center sm:text-left">
            {t('footer.madeWithLove')} <Heart className="w-4 h-4 text-primary fill-primary inline-block" />{" "}
            <a 
              href="https://monynha.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-primary transition-colors"
            >
              {t('footer.byMonynhaSoftwares')}
            </a>
          </p>
          <div className="flex items-center gap-3 sm:gap-4">
            <a href="https://monynha.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors p-2">
              <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
            </a>
            <a href="https://github.com/Monynha-Softwares/video-vault" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors p-2">
              <Github className="w-4 h-4 sm:w-5 sm:h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
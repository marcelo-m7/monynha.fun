import { Github, Globe, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';

export const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border/50 bg-muted/30">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
                <span className="text-lg font-bold">M</span>
              </div>
              <span className="font-bold text-xl tracking-tight">
                Monynha<span className="text-primary">Fun</span>
              </span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-sm">
              {t('footer.description')}
            </p>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">{t('footer.navigation')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/videos" className="hover:text-primary transition-colors">{t('footer.categories')}</Link></li>
              <li><Link to="/videos?recent=true" className="hover:text-primary transition-colors">{t('footer.recent')}</Link></li>
              <li><Link to="/videos?featured=true" className="hover:text-primary transition-colors">{t('footer.featured')}</Link></li>
              <li><Link to="/submit" className="hover:text-primary transition-colors">{t('footer.submitVideo')}</Link></li>
            </ul>
          </div>

          {/* Community */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">{t('footer.community')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/community" className="hover:text-primary transition-colors">{t('footer.community')}</Link></li>
              <li><Link to="/about" className="hover:text-primary transition-colors">{t('footer.about')}</Link></li>
              <li><Link to="/rules" className="hover:text-primary transition-colors">{t('footer.rules')}</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">{t('footer.contact')}</Link></li>
              <li><Link to="/faq" className="hover:text-primary transition-colors">{t('footer.faq')}</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 mt-8 border-t border-border/50">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
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
          <div className="flex items-center gap-4">
            <a href="https://monynha.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
              <Globe className="w-5 h-5" />
            </a>
            <a href="https://github.com/Monynha-Softwares/video-vault" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

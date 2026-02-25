import React from 'react';
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { 
  Search, Plus, LogOut, Heart, Globe, ListVideo, 
  User as UserIcon, Settings, KeyRound, Home, 
  Info, BookOpen, Mail, HelpCircle, Users 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { NavLink } from "@/components/NavLink";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import i18n from 'i18next';

interface MobileNavProps {
  user: any;
  profile: any;
  onClose: () => void;
  onSignOut: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  user,
  profile,
  onClose,
  onSignOut,
  searchQuery,
  setSearchQuery,
  onSearchSubmit
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
  };

  const navLinks = [
    { to: "/", label: t('header.home'), icon: Home },
    { to: "/videos", label: t('header.videos'), icon: ListVideo },
    { to: "/playlists", label: t('header.playlists'), icon: ListVideo },
    { to: "/community", label: t('footer.community'), icon: Users },
    { to: "/about", label: t('footer.about'), icon: Info },
    { to: "/rules", label: t('footer.rules'), icon: BookOpen },
    { to: "/contact", label: t('footer.contact'), icon: Mail },
    { to: "/faq", label: t('footer.faq'), icon: HelpCircle },
  ];

  return (
    <ScrollArea className="flex-1 py-4 px-1">
      <div className="space-y-6">
        {/* 1. Mobile Search */}
        <form onSubmit={onSearchSubmit} className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('header.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 bg-muted/50 border-0 focus-visible:ring-primary/30 h-11"
          />
        </form>

        {/* 2. Main Navigation (Prioritized) */}
        <nav className="space-y-1">
          <p className="px-4 text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
            {t('footer.navigation')}
          </p>
          <div className="grid gap-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all"
                activeClassName="bg-muted text-foreground font-semibold"
                onClick={onClose}
              >
                <link.icon className="h-5 w-5" />
                <span>{link.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        <Separator className="opacity-50" />

        {/* 3. User Section / Auth Actions */}
        {user && profile ? (
          <div className="space-y-3">
            <p className="px-4 text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
              {t('header.accountSettings')}
            </p>
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl mx-4">
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarImage src={profile.avatar_url || undefined} alt={profile.display_name || profile.username || 'User'} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {profile.display_name ? profile.display_name[0].toUpperCase() : (profile.username ? profile.username[0].toUpperCase() : <UserIcon className="h-5 w-5" />)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{profile.display_name || profile.username}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-1">
              <NavLink
                to={`/profile/${profile.username}`}
                className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all"
                activeClassName="bg-primary/10 text-primary font-medium"
                onClick={onClose}
              >
                <UserIcon className="h-5 w-5" />
                <span>{t('header.myProfile')}</span>
              </NavLink>
              <NavLink
                to="/favorites"
                className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all"
                activeClassName="bg-primary/10 text-primary font-medium"
                onClick={onClose}
              >
                <Heart className="h-5 w-5" />
                <span>{t('header.favorites')}</span>
              </NavLink>
              <NavLink
                to="/account/settings"
                className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all"
                activeClassName="bg-primary/10 text-primary font-medium"
                onClick={onClose}
              >
                <Settings className="h-5 w-5" />
                <span>{t('header.accountSettings')}</span>
              </NavLink>
            </div>

            <div className="pt-2 px-4 space-y-2">
              <Button
                variant="hero"
                className="w-full justify-center gap-2 h-11 rounded-xl shadow-sm"
                onClick={() => { navigate('/submit'); onClose(); }}
              >
                <Plus className="h-5 w-5" />
                {t('header.submitVideo')}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-center gap-2 h-11 rounded-xl border-muted-foreground/20 hover:bg-destructive/5 hover:text-destructive hover:border-destructive/20"
                onClick={onSignOut}
              >
                <LogOut className="h-5 w-5" />
                {t('header.logout')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 px-4">
            <Button
              variant="hero"
              className="w-full justify-center gap-2 h-11 rounded-xl shadow-sm"
              onClick={() => { navigate('/submit'); onClose(); }}
            >
              <Plus className="h-5 w-5" />
              {t('header.submitVideo')}
            </Button>
            <Button
              variant="outline"
              className="w-full h-11 rounded-xl border-primary/20 text-primary hover:bg-primary/5"
              onClick={() => { navigate('/auth'); onClose(); }}
            >
              {t('header.login')}
            </Button>
          </div>
        )}

        <Separator className="opacity-50" />

        {/* 4. Language Switcher */}
        <div className="px-4 space-y-3 pb-8">
          <Label htmlFor="mobile-language-switcher" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            {t('header.languageLabel')}
          </Label>
          <Select value={i18n.language} onValueChange={changeLanguage}>
            <SelectTrigger id="mobile-language-switcher" className="w-full h-11 bg-muted/50 border-0 focus:ring-primary/30 rounded-xl">
              <Globe className="w-5 h-5 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="pt">Português (PT)</SelectItem>
              <SelectItem value="en">English (EN)</SelectItem>
              <SelectItem value="es">Español (ES)</SelectItem>
              <SelectItem value="fr">Français (FR)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </ScrollArea>
  );
};
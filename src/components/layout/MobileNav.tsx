import React from 'react';
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { 
  Search, Plus, LogOut, Heart, Globe, ListVideo, 
  User as UserIcon, Settings, KeyRound, Home, 
  Info, BookOpen, Mail, HelpCircle, Users, Bell, MessageCircle, ShieldCheck
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
import { User } from '@supabase/supabase-js';
import { Profile } from '@/entities/profile/profile.types';

interface MobileNavProps {
  user: User | null;
  profile: Profile | null | undefined;
  unreadMessagesCount: number;
  unreadNotificationsCount: number;
  onClose: () => void;
  onSignOut: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  user,
  profile,
  unreadMessagesCount,
  unreadNotificationsCount,
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
    <div className="flex flex-col flex-1 h-full overflow-hidden">
      <div className="px-1 pb-6 pt-2">
        <form onSubmit={onSearchSubmit} className="relative group">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            type="search"
            placeholder={t('header.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 bg-muted/50 border-transparent focus-visible:ring-primary/30 h-12 rounded-xl transition-all shadow-sm"
          />
        </form>
      </div>

      <Separator className="opacity-50" />

      <ScrollArea className="flex-1 py-4 px-1">
        <div className="space-y-8">
          <nav className="space-y-1">
            <p className="px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-3 opacity-70">
              {t('footer.navigation')}
            </p>
            <div className="grid gap-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className="flex items-center gap-3 px-4 py-3.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-2xl transition-all"
                  activeClassName="bg-primary/8 text-foreground font-bold"
                  onClick={onClose}
                >
                  <link.icon className="h-5 w-5" />
                  <span className="text-sm">{link.label}</span>
                </NavLink>
              ))}
            </div>
          </nav>

          <Separator className="opacity-50 mx-4" />

          {user && profile ? (
            <div className="space-y-4">
              <p className="px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-3 opacity-70">
                {t('header.accountSettings')}
              </p>
              <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-2xl mx-4 border border-border/50">
                <Avatar className="h-10 w-10 border-2 border-primary/20 shadow-sm">
                  <AvatarImage src={profile.avatar_url || undefined} alt={profile.display_name || profile.username || 'User'} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {profile.display_name ? profile.display_name[0].toUpperCase() : (profile.username ? profile.username[0].toUpperCase() : <UserIcon className="h-5 w-5" />)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{profile.display_name || profile.username}</p>
                  <p className="text-[10px] text-muted-foreground truncate opacity-80">{user.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-1">
                <NavLink
                  to={`/profile/${profile.username}`}
                  className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-2xl transition-all"
                  activeClassName="bg-primary/8 text-foreground font-medium"
                  onClick={onClose}
                >
                  <UserIcon className="h-5 w-5" />
                  <span className="text-sm">{t('header.myProfile')}</span>
                </NavLink>
                <NavLink
                  to="/favorites"
                  className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-2xl transition-all"
                  activeClassName="bg-primary/8 text-foreground font-medium"
                  onClick={onClose}
                >
                  <Heart className="h-5 w-5" />
                  <span className="text-sm">{t('header.favorites')}</span>
                </NavLink>
                <NavLink
                  to="/messages"
                  className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-2xl transition-all"
                  activeClassName="bg-primary/8 text-foreground font-medium"
                  onClick={onClose}
                >
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-sm flex-1">{t('header.messages')}</span>
                  {unreadMessagesCount > 0 && (
                    <span className="text-xs font-bold rounded-full min-w-5 h-5 px-1 bg-primary text-primary-foreground inline-flex items-center justify-center">
                      {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                    </span>
                  )}
                </NavLink>
                <NavLink
                  to="/notifications"
                  className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-2xl transition-all"
                  activeClassName="bg-primary/8 text-foreground font-medium"
                  onClick={onClose}
                >
                  <Bell className="h-5 w-5" />
                  <span className="text-sm flex-1">{t('header.notifications')}</span>
                  {unreadNotificationsCount > 0 && (
                    <span className="text-xs font-bold rounded-full min-w-5 h-5 px-1 bg-primary text-primary-foreground inline-flex items-center justify-center">
                      {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                    </span>
                  )}
                </NavLink>
                <NavLink
                  to="/account/settings"
                  className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-2xl transition-all"
                  activeClassName="bg-primary/8 text-foreground font-medium"
                  onClick={onClose}
                >
                  <Settings className="h-5 w-5" />
                  <span className="text-sm">{t('header.accountSettings')}</span>
                </NavLink>
                {(profile.role === 'editor' || profile.role === 'admin') && (
                  <NavLink
                    to="/editorial"
                    className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-2xl transition-all"
                    activeClassName="bg-primary/8 text-foreground font-medium"
                    onClick={onClose}
                  >
                    <ShieldCheck className="h-5 w-5" />
                    <span className="text-sm">{t('header.editorialPortal')}</span>
                  </NavLink>
                )}
              </div>

              <div className="pt-2 px-4 space-y-3">
                <Button
                  variant="hero"
                  className="w-full justify-center gap-2 h-12 rounded-2xl shadow-md"
                  onClick={() => { navigate('/submit'); onClose(); }}
                >
                  <Plus className="h-5 w-5" />
                  {t('header.submitVideo')}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-center gap-2 h-12 rounded-2xl text-muted-foreground hover:text-destructive hover:bg-destructive/5"
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
                className="w-full justify-center gap-2 h-12 rounded-2xl shadow-md"
                onClick={() => { navigate('/submit'); onClose(); }}
              >
                <Plus className="h-5 w-5" />
                {t('header.submitVideo')}
              </Button>
              <Button
                variant="outline"
                className="w-full h-12 rounded-2xl border-primary/20 text-foreground hover:bg-primary/5 font-bold"
                onClick={() => { navigate('/auth'); onClose(); }}
              >
                {t('header.login')}
              </Button>
            </div>
          )}

          <Separator className="opacity-50 mx-4" />

          <div className="px-4 space-y-4 pb-12">
            <Label htmlFor="mobile-language-switcher" className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-70">
              {t('header.languageLabel')}
            </Label>
            <Select value={i18n.language} onValueChange={changeLanguage}>
              <SelectTrigger id="mobile-language-switcher" className="w-full h-12 bg-muted/50 border-transparent focus:ring-primary/30 rounded-2xl shadow-sm">
                <Globe className="w-5 h-5 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border/50 elevation-dialog">
                <SelectItem value="pt" className="rounded-xl">Português (PT)</SelectItem>
                <SelectItem value="en" className="rounded-xl">English (EN)</SelectItem>
                <SelectItem value="es" className="rounded-xl">Español (ES)</SelectItem>
                <SelectItem value="fr" className="rounded-xl">Français (FR)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
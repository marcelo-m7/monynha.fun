import { Link, useNavigate } from "react-router-dom";
import { Search, Plus, Menu, Heart, Globe, User as UserIcon, Settings, ListVideo, KeyRound, LogOut, Bell, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useAuth } from "@/features/auth/useAuth";
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfileById } from "@/features/profile/queries/useProfile";
import { useUnreadMessagesCount } from '@/features/messages';
import { useUnreadNotificationsCount } from '@/features/notifications';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NavLink } from "@/components/NavLink";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useUnreadMessagesCount } from "@/features/messages";
import { useUnreadNotificationsCount } from "@/features/notifications";

export const Header = () => {
  const { t } = useTranslation();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, signOut } = useAuth();
  const { data: profile } = useProfileById(user?.id);
    const { data: unreadMessages = 0 } = useUnreadMessagesCount();
    const { data: unreadNotifications = 0 } = useUnreadNotificationsCount();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    setIsSheetOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/videos?query=${encodeURIComponent(searchQuery.trim())}`);
      setIsSheetOpen(false);
    }
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/30 bg-background/90 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-sm bg-primary text-primary-foreground shadow-[0_0_12px_var(--glow-primary)] transition-transform group-hover:scale-105">
            <span className="text-lg font-bold">M</span>
          </div>
          <span className="hidden font-bold text-xl tracking-[0.2em] uppercase sm:inline-block">
            Monynha<span className="text-primary">Fun</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 ml-8">
          <NavLink
            to="/videos"
            className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            activeClassName="text-primary"
          >
            {t('header.videos')}
          </NavLink>
          <NavLink
            to="/playlists"
            className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            activeClassName="text-primary"
          >
            {t('header.playlists')}
          </NavLink>
          <NavLink
            to="/community"
            className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            activeClassName="text-primary"
          >
            {t('footer.community')}
          </NavLink>
        </nav>

        {/* Desktop Search */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-xl ml-auto mr-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('header.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 h-10 bg-card/90 border border-border/50 focus-visible:ring-primary/40"
            />
          </div>
        </form>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {user && profile ? (
            <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden sm:flex relative text-muted-foreground hover:text-foreground"
                  onClick={() => navigate('/notifications')}
                >
                  <Bell className="h-4 w-4" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] leading-[18px] font-bold">
                      {unreadNotifications > 99 ? '99+' : unreadNotifications}
                    </span>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden sm:flex relative text-muted-foreground hover:text-foreground"
                  onClick={() => navigate('/messages')}
                >
                  <MessageCircle className="h-4 w-4" />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] leading-[18px] font-bold">
                      {unreadMessages > 99 ? '99+' : unreadMessages}
                    </span>
                  )}
                </Button>
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:flex gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/favorites')}
              >
                <Heart className="h-4 w-4" />
                <span className="hidden lg:inline">{t('header.favorites')}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:inline-flex relative text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/messages')}
                aria-label={t('header.messages')}
              >
                <MessageCircle className="h-4 w-4" />
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                  </span>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:inline-flex relative text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/notifications')}
                aria-label={t('header.notifications')}
              >
                <Bell className="h-4 w-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                  </span>
                )}
              </Button>
              <Button
                variant="hero"
                size="sm"
                className="hidden sm:flex gap-2"
                onClick={() => navigate('/submit')}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden lg:inline">{t('header.submitVideo')}</span>
              </Button>

              <Link to={`/profile/${profile.username}`} className="relative h-9 w-9 rounded-full hidden sm:flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
                <Avatar className="h-9 w-9 border border-primary/20">
                  <AvatarImage src={profile.avatar_url || undefined} alt={profile.display_name || profile.username || 'User'} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {profile.display_name ? profile.display_name[0].toUpperCase() : (profile.username ? profile.username[0].toUpperCase() : <UserIcon className="h-5 w-5" />)}
                  </AvatarFallback>
                </Avatar>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-primary/5">
                    <Settings className="h-5 w-5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 mt-2 rounded-xl" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-bold leading-none">{profile.display_name || profile.username}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile/edit')} className="rounded-lg">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>{t('header.editProfile')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/account/settings')} className="rounded-lg">
                    <KeyRound className="mr-2 h-4 w-4" />
                    <span>{t('header.accountSettings')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/notifications')} className="rounded-lg">
                      <Bell className="mr-2 h-4 w-4" />
                      <span>{t('header.notifications')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/messages')} className="rounded-lg">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      <span>{t('header.messages')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="rounded-lg text-destructive focus:text-destructive focus:bg-destructive/5">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t('header.logout')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button
                variant="hero"
                size="sm"
                className="hidden sm:flex gap-2"
                onClick={() => navigate('/submit')}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden lg:inline">{t('header.submitVideo')}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex rounded-full px-5"
                onClick={() => navigate('/auth')}
              >
                {t('header.login')}
              </Button>
            </>
          )}

          {/* Desktop Language Switcher */}
          <Select value={i18n.language} onValueChange={changeLanguage}>
            <SelectTrigger className="w-[85px] h-9 bg-muted/50 border-0 focus:ring-primary/30 hidden sm:flex rounded-full">
              <Globe className="w-4 h-4 mr-1 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="pt">PT</SelectItem>
              <SelectItem value="en">EN</SelectItem>
              <SelectItem value="es">ES</SelectItem>
              <SelectItem value="fr">FR</SelectItem>
            </SelectContent>
          </Select>

          <ThemeToggle />

          {/* Mobile Menu Trigger */}
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden rounded-full hover:bg-primary/5 h-10 w-10"
              >
                <Menu className="h-6 w-6" />
                <span className="sr-only">{t('header.toggleMenu')}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:w-[400px] flex flex-col p-6 rounded-l-3xl border-none elevation-dialog">
              <SheetHeader className="mb-4">
                <SheetTitle className="text-left">
                  <Link to="/" className="flex items-center gap-2" onClick={() => setIsSheetOpen(false)}>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
                      <span className="text-lg font-bold">M</span>
                    </div>
                    <span className="font-bold text-xl tracking-tight">
                      Monynha<span className="text-primary">Fun</span>
                    </span>
                  </Link>
                </SheetTitle>
              </SheetHeader>
              
              <MobileNav
                user={user}
                profile={profile}
                unreadMessagesCount={unreadMessagesCount}
                unreadNotificationsCount={unreadNotificationsCount}
                onClose={() => setIsSheetOpen(false)}
                onSignOut={handleSignOut}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onSearchSubmit={handleSearchSubmit}
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
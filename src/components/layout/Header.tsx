import { Link, useNavigate } from "react-router-dom";
import { Plus, Menu, Heart, Globe, User as UserIcon, Settings, KeyRound, LogOut, Bell, MessageCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/features/auth/useAuth";
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfileById } from "@/features/profile/queries/useProfile";
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
  const { data: unreadMessagesCount = 0 } = useUnreadMessagesCount();
  const { data: unreadNotificationsCount = 0 } = useUnreadNotificationsCount();
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
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <div className="container flex h-16 items-center gap-6">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <div className="flex h-8 w-8 items-center justify-center bg-primary text-primary-foreground transition-transform group-hover:scale-105">
            <span className="text-sm font-bold tracking-tighter">O2</span>
          </div>
          <span className="hidden font-bold text-lg tracking-[0.2em] uppercase sm:inline-block">
            Tube<span className="text-primary font-black">O2</span>
          </span>
        </Link>

        {/* Divider */}
        <div className="hidden md:block h-5 w-px bg-border shrink-0" />

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          <NavLink
            to="/videos"
            className="px-3 py-1.5 text-sm font-semibold rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
            activeClassName="text-foreground bg-primary/12 hover:bg-primary/16"
          >
            {t('header.videos')}
          </NavLink>
          <NavLink
            to="/playlists"
            className="px-3 py-1.5 text-sm font-semibold rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
            activeClassName="text-foreground bg-primary/12 hover:bg-primary/16"
          >
            {t('header.playlists')}
          </NavLink>
          <NavLink
            to="/community"
            className="px-3 py-1.5 text-sm font-semibold rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
            activeClassName="text-foreground bg-primary/12 hover:bg-primary/16"
          >
            {t('header.community')}
          </NavLink>
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-1">
          {user && profile ? (
            <>
              {/* Utility icons */}
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60"
                onClick={() => navigate('/favorites')}
                aria-label={t('header.favorites')}
              >
                <Heart className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full relative text-muted-foreground hover:text-foreground hover:bg-muted/60"
                onClick={() => navigate('/messages')}
                aria-label={t('header.messages')}
              >
                <MessageCircle className="h-4 w-4" />
                {unreadMessagesCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 h-4 min-w-4 px-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center leading-none">
                    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                  </span>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full relative text-muted-foreground hover:text-foreground hover:bg-muted/60"
                onClick={() => navigate('/notifications')}
                aria-label={t('header.notifications')}
              >
                <Bell className="h-4 w-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 h-4 min-w-4 px-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center leading-none">
                    {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                  </span>
                )}
              </Button>

              {/* Divider */}
              <div className="h-5 w-px bg-border mx-1 shrink-0" />

              {/* Submit CTA */}
              <Button
                variant="hero"
                size="sm"
                className="gap-1.5 rounded-full px-4"
                onClick={() => navigate('/submit')}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t('header.submitVideo')}</span>
              </Button>

              {/* Avatar Dropdown (replaces separate avatar link + gear icon) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="ml-1 h-9 w-9 rounded-full ring-2 ring-transparent hover:ring-primary/40 focus-visible:ring-primary/50 focus-visible:outline-none transition-all">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={profile.avatar_url || undefined} alt={profile.display_name || profile.username || 'User'} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                        {(profile.display_name?.[0] ?? profile.username?.[0] ?? 'U').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-60 mt-2 rounded-2xl p-1.5" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal py-2 px-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                          {(profile.display_name?.[0] ?? profile.username?.[0] ?? 'U').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <p className="text-sm font-bold leading-none truncate">{profile.display_name || profile.username}</p>
                        <p className="text-xs leading-none text-muted-foreground mt-1 truncate">{user.email}</p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem onClick={() => navigate(`/profile/${profile.username}`)} className="rounded-xl py-2">
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>{t('header.myProfile')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/profile/edit')} className="rounded-xl py-2">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>{t('header.editProfile')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/account/settings')} className="rounded-xl py-2">
                    <KeyRound className="mr-2 h-4 w-4" />
                    <span>{t('header.accountSettings')}</span>
                  </DropdownMenuItem>
                  {(profile.role === 'editor' || profile.role === 'admin') && (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/editorial')} className="rounded-xl py-2">
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        <span>{t('header.editorialPortal')}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/editor/applications')} className="rounded-xl py-2">
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        <span>{t('editorApplications.adminPage.title')}</span>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem onClick={handleSignOut} className="rounded-xl py-2 text-destructive focus:text-destructive focus:bg-destructive/5">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t('header.logout')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-foreground rounded-full"
                onClick={() => navigate('/submit')}
              >
                <Plus className="h-3.5 w-3.5" />
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

          {/* Language + Theme */}
          <div className="h-5 w-px bg-border mx-0.5 shrink-0" />
          <Select value={i18n.language} onValueChange={changeLanguage}>
            <SelectTrigger aria-label={t('header.languageLabel')} className="w-[72px] h-8 bg-transparent border-0 shadow-none focus:ring-0 text-xs font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/60">
              <Globe className="w-3.5 h-3.5 mr-1 shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl min-w-[80px]">
              <SelectItem value="pt">PT</SelectItem>
              <SelectItem value="en">EN</SelectItem>
              <SelectItem value="es">ES</SelectItem>
              <SelectItem value="fr">FR</SelectItem>
            </SelectContent>
          </Select>
          <ThemeToggle />

          <div className="h-5 w-px bg-border mx-0.5 shrink-0" />
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-muted/60 h-9 w-9"
              aria-label={t('header.toggleMenu')}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">{t('header.toggleMenu')}</span>
            </Button>
          </SheetTrigger>
        </div>

        {/* Mobile: theme + menu trigger */}
        <div className="flex md:hidden items-center gap-1">
          <ThemeToggle />
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-muted/60 h-10 w-10"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">{t('header.toggleMenu')}</span>
            </Button>
          </SheetTrigger>
        </div>

        <SheetContent side="right" className="w-full sm:w-[400px] md:w-[420px] flex flex-col p-6 rounded-l-3xl border-none elevation-dialog">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left">
              <Link to="/" className="flex items-center gap-2" onClick={() => setIsSheetOpen(false)}>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
                  <span className="text-sm font-bold tracking-tighter">O2</span>
                </div>
                <span className="font-bold text-xl tracking-tight">
                  Tube<span className="text-primary">O2</span>
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
      </div>
      </Sheet>
    </header>
  );
};
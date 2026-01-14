import { Link, useNavigate } from "react-router-dom";
import { Search, Plus, Menu, X, LogOut, Heart, Globe, ListVideo } from "lucide-react"; // Import ListVideo icon
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from 'react-i18next'; // Import useTranslation
import i18n from 'i18next'; // Import i18next instance
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Header = () => {
  const { t } = useTranslation(); // Initialize useTranslation
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/videos?query=${encodeURIComponent(searchQuery.trim())}`);
      setIsMenuOpen(false); // Close mobile menu after search
    }
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md transition-transform group-hover:scale-105">
            <span className="text-lg font-bold">M</span>
          </div>
          <span className="hidden font-bold text-xl tracking-tight sm:inline-block">
            Monynha<span className="text-primary">Fun</span>
          </span>
        </Link>

        {/* Search Bar - Desktop */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-xl mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('header.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 h-10 bg-muted/50 border-0 focus-visible:ring-primary/30"
            />
          </div>
        </form>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:flex gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/playlists')}
              >
                <ListVideo className="h-4 w-4" />
                {t('header.playlists')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:flex gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/favorites')}
              >
                <Heart className="h-4 w-4" />
                {t('header.favorites')}
              </Button>
              <Button
                variant="hero"
                size="sm"
                className="hidden sm:flex gap-2"
                onClick={() => navigate('/submit')}
              >
                <Plus className="h-4 w-4" />
                {t('header.submitVideo')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="hidden sm:flex gap-2 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                {t('header.logout')}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="hero"
                size="sm"
                className="hidden sm:flex gap-2"
                onClick={() => navigate('/auth')}
              >
                <Plus className="h-4 w-4" />
                {t('header.submitVideo')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex"
                onClick={() => navigate('/auth')}
              >
                {t('header.login')}
              </Button>
            </>
          )}

          {/* Language Switcher */}
          <Select value={i18n.language} onValueChange={changeLanguage}>
            <SelectTrigger className="w-[100px] h-9 bg-muted/50 border-0 focus:ring-primary/30 hidden sm:flex">
              <Globe className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pt">PT</SelectItem>
              <SelectItem value="en">EN</SelectItem>
              <SelectItem value="es">ES</SelectItem>
              <SelectItem value="fr">FR</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => {
            setIsMenuOpen(!isMenuOpen);
          }}>
            <Search className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-border/50 bg-background animate-fade-in">
          <div className="container py-4 space-y-4">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t('header.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 bg-muted/50 border-0"
              />
            </form>
            <div className="flex flex-col gap-2">
              {user ? (
                <>
                  <Button
                    variant="ghost"
                    className="w-full justify-center gap-2 text-muted-foreground hover:text-foreground"
                    onClick={() => { navigate('/playlists'); setIsMenuOpen(false); }}
                  >
                    <ListVideo className="h-4 w-4" />
                    {t('header.playlists')}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-center gap-2 text-muted-foreground hover:text-foreground"
                    onClick={() => { navigate('/favorites'); setIsMenuOpen(false); }}
                  >
                    <Heart className="h-4 w-4" />
                    {t('header.favorites')}
                  </Button>
                  <Button
                    variant="hero"
                    className="w-full justify-center gap-2"
                    onClick={() => { navigate('/submit'); setIsMenuOpen(false); }}
                  >
                    <Plus className="h-4 w-4" />
                    {t('header.submitVideo')}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4" />
                    {t('header.logout')}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="hero"
                    className="w-full justify-center gap-2"
                    onClick={() => navigate('/auth')}
                  >
                    <Plus className="h-4 w-4" />
                    {t('header.submitVideo')}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/auth')}
                  >
                    {t('header.login')}
                  </Button>
                </>
              )}
              {/* Mobile Language Switcher */}
              <Select value={i18n.language} onValueChange={changeLanguage}>
                <SelectTrigger className="w-full h-9 bg-muted/50 border-0 focus:ring-primary/30 flex sm:hidden">
                  <Globe className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt">PT</SelectItem>
                  <SelectItem value="en">EN</SelectItem>
                  <SelectItem value="es">ES</SelectItem>
                  <SelectItem value="fr">FR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
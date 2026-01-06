import { Link, useNavigate } from "react-router-dom";
import { Search, Plus, Menu, X, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
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
        <div className="hidden md:flex flex-1 max-w-xl mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar vídeos, canais..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 h-10 bg-muted/50 border-0 focus-visible:ring-primary/30"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button variant="hero" size="sm" className="hidden sm:flex gap-2">
                <Plus className="h-4 w-4" />
                Enviar Vídeo
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSignOut}
                className="hidden sm:flex gap-2 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                Sair
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
                Enviar Vídeo
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="hidden sm:flex"
                onClick={() => navigate('/auth')}
              >
                Entrar
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="md:hidden">
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar vídeos, canais..."
                className="w-full pl-10 bg-muted/50 border-0"
              />
            </div>
            <div className="flex flex-col gap-2">
              {user ? (
                <>
                  <Button variant="hero" className="w-full justify-center gap-2">
                    <Plus className="h-4 w-4" />
                    Enviar Vídeo
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
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
                    Enviar Vídeo
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate('/auth')}
                  >
                    Entrar
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

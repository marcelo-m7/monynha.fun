import { Link, useNavigate } from "react-router-dom";
import { Heart, LogIn, LogOut, Plus, Settings, User as UserIcon, ListVideo } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { LanguageSelector } from "@/components/navigation/LanguageSelector";
import { useAuth } from "@/features/auth/useAuth";
import { useProfileById } from "@/features/profile/queries/useProfile";

export const Header = () => {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { data: profile } = useProfileById(user?.id);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 lg:px-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <SidebarTrigger variant="ghost" size="icon" className="h-10 w-10 sm:h-9 sm:w-9" />
          <Link to="/" className="flex items-center gap-1.5 sm:gap-2 group">
            <div className="relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg sm:rounded-xl bg-primary text-primary-foreground shadow-md transition-transform group-hover:scale-105">
              <span className="text-base sm:text-lg font-bold">M</span>
            </div>
            <span className="hidden font-bold text-lg sm:text-xl tracking-tight sm:inline-block">
              Monynha<span className="text-primary">Fun</span>
            </span>
          </Link>
        </div>

        <Menubar className="border-0 bg-transparent p-0 shadow-none gap-1">
          <MenubarMenu>
            <MenubarTrigger className="text-sm sm:text-base px-2 sm:px-3 h-10">{t("header.accountMenu")}</MenubarTrigger>
            <MenubarContent align="end">
              {user && profile ? (
                <>
                  <MenubarLabel className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage
                        src={profile.avatar_url || undefined}
                        alt={profile.display_name || profile.username || "User"}
                      />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">
                        {profile.display_name
                          ? profile.display_name[0].toUpperCase()
                          : profile.username
                            ? profile.username[0].toUpperCase()
                            : "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-medium leading-none">{profile.display_name || profile.username}</p>
                      <p className="text-[10px] text-muted-foreground">{user.email}</p>
                    </div>
                  </MenubarLabel>
                  <MenubarSeparator />
                  <MenubarItem onSelect={() => navigate(`/profile/${profile.username}`)}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    {t("header.myProfile")}
                  </MenubarItem>
                  <MenubarItem onSelect={() => navigate("/profile/edit")}>
                    <Settings className="mr-2 h-4 w-4" />
                    {t("header.editProfile")}
                  </MenubarItem>
                  <MenubarItem onSelect={() => navigate("/favorites")}>
                    <Heart className="mr-2 h-4 w-4" />
                    {t("header.favorites")}
                  </MenubarItem>
                  <MenubarSeparator />
                  <MenubarItem onSelect={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    {t("header.logout")}
                  </MenubarItem>
                </>
              ) : (
                <MenubarItem onSelect={() => navigate("/auth")}>
                  <LogIn className="mr-2 h-4 w-4" />
                  {t("header.login")}
                </MenubarItem>
              )}
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger className="text-sm sm:text-base px-2 sm:px-3 h-10">{t("header.createMenu")}</MenubarTrigger>
            <MenubarContent align="end">
              <MenubarItem onSelect={() => navigate("/submit")}>
                <Plus className="mr-2 h-4 w-4" />
                {t("header.submitVideo")}
              </MenubarItem>
              <MenubarItem onSelect={() => navigate("/playlists/new")}>
                <ListVideo className="mr-2 h-4 w-4" />
                {t("playlists.createPlaylist")}
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <LanguageSelector variant="menubar" />
        </Menubar>
      </div>
    </header>
  );
};

import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Heart,
  HelpCircle,
  Home,
  Info,
  ListVideo,
  LogIn,
  Mail,
  Plus,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { SearchInput } from "@/components/navigation/SearchInput";
import { LanguageSelector } from "@/components/navigation/LanguageSelector";
import { useAuth } from "@/features/auth/useAuth";
import { useProfileById } from "@/features/profile/queries/useProfile";

export const AppSidebar = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: profile } = useProfileById(user?.id);
  const navigate = useNavigate();

  const browseLinks = [
    { to: "/", label: t("header.home"), icon: Home },
    { to: "/videos", label: t("footer.categories"), icon: ListVideo },
    { to: "/playlists", label: t("header.playlists"), icon: ListVideo },
  ];

  const communityLinks = [
    { to: "/community", label: t("footer.community"), icon: Users },
    { to: "/faq", label: t("footer.faq"), icon: HelpCircle },
  ];

  const legalLinks = [
    { to: "/about", label: t("footer.about"), icon: Info },
    { to: "/rules", label: t("footer.rules"), icon: BookOpen },
    { to: "/contact", label: t("footer.contact"), icon: Mail },
  ];

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <span className="text-sm font-bold">M</span>
            </div>
            <span className="text-sm font-semibold tracking-tight">Monynha Fun</span>
          </Link>
        </div>
        <SearchInput
          className="px-2"
          inputClassName="h-9 bg-muted/60 border-0"
        />
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("header.browseSection")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {browseLinks.map((link) => (
                <SidebarMenuItem key={link.to}>
                  <SidebarMenuButton asChild tooltip={link.label}>
                    <NavLink
                      to={link.to}
                      className="flex items-center gap-2"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <link.icon className="h-4 w-4" />
                      <span>{link.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t("header.communitySection")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {communityLinks.map((link) => (
                <SidebarMenuItem key={link.to}>
                  <SidebarMenuButton asChild tooltip={link.label}>
                    <NavLink
                      to={link.to}
                      className="flex items-center gap-2"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <link.icon className="h-4 w-4" />
                      <span>{link.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t("header.legalSection")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {legalLinks.map((link) => (
                <SidebarMenuItem key={link.to}>
                  <SidebarMenuButton asChild tooltip={link.label}>
                    <NavLink
                      to={link.to}
                      className="flex items-center gap-2"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <link.icon className="h-4 w-4" />
                      <span>{link.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        <div className="space-y-3 px-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip={t("header.playlists")}>
                <NavLink
                  to="/playlists"
                  className="flex items-center gap-2"
                  activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                >
                  <ListVideo className="h-4 w-4" />
                  <span>{t("header.playlists")}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip={t("header.favorites")}>
                <NavLink
                  to="/favorites"
                  className="flex items-center gap-2"
                  activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                >
                  <Heart className="h-4 w-4" />
                  <span>{t("header.favorites")}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip={t("header.submitVideo")}>
                <NavLink
                  to="/submit"
                  className="flex items-center gap-2"
                  activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                >
                  <Plus className="h-4 w-4" />
                  <span>{t("header.submitVideo")}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          <LanguageSelector showLabel className="px-1" />

          {user && profile ? (
            <button
              type="button"
              onClick={() => navigate(`/profile/${profile.username}`)}
              className="flex w-full items-center gap-3 rounded-lg border border-sidebar-border px-3 py-2 text-left"
            >
              <Avatar className="h-9 w-9">
                <AvatarImage
                  src={profile.avatar_url || undefined}
                  alt={profile.display_name || profile.username || "User"}
                />
                <AvatarFallback className="bg-primary/20 text-primary">
                  {profile.display_name
                    ? profile.display_name[0].toUpperCase()
                    : profile.username
                      ? profile.username[0].toUpperCase()
                      : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {profile.display_name || profile.username}
                </p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
            </button>
          ) : (
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => navigate("/auth")}
            >
              <LogIn className="h-4 w-4" />
              {t("header.login")}
            </Button>
          )}
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};

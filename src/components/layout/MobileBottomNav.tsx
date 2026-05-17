import { Home, ListVideo, PlusCircle, Search, UserCircle } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/features/auth/useAuth";
import { useProfileById } from "@/features/profile/queries/useProfile";
import { useTranslation } from "react-i18next";

export function MobileBottomNav() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: profile } = useProfileById(user?.id);
  const profilePath = profile?.username ? `/profile/${profile.username}` : "/auth";

  const items = [
    { to: "/", label: t("header.home"), icon: Home },
    { to: "/videos", label: t("header.videos"), icon: Search },
    { to: "/submit", label: t("header.submitVideo"), icon: PlusCircle, primary: true },
    { to: "/playlists", label: t("header.playlists"), icon: ListVideo },
    { to: profilePath, label: user ? t("header.myProfile") : t("header.login"), icon: UserCircle },
  ];

  return (
    <nav
      aria-label={t("header.mobileNavigation")}
      className="safe-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-background/82 px-2 pt-2 backdrop-blur-2xl md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[0.65rem] font-semibold text-muted-foreground transition-all hover:bg-muted/70 hover:text-foreground"
            activeClassName={item.primary ? "text-primary" : "bg-muted text-foreground"}
          >
            <item.icon className={item.primary ? "h-6 w-6" : "h-5 w-5"} aria-hidden="true" />
            <span className="max-w-full truncate">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}


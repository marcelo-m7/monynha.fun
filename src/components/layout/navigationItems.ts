import {
  BookOpen,
  Cookie,
  GraduationCap,
  HelpCircle,
  Home,
  Info,
  ListVideo,
  Mail,
  Scale,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavigationItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
}

export const primaryNavigationItems: NavigationItem[] = [
  { to: "/videos", labelKey: "header.videos", icon: ListVideo },
  { to: "/playlists", labelKey: "header.playlists", icon: ListVideo },
  { to: "/facodi", labelKey: "header.facodi", icon: GraduationCap },
  { to: "/curadoria", labelKey: "header.curation", icon: Sparkles },
  { to: "/community", labelKey: "header.community", icon: Users },
];

export const mobileNavigationItems: NavigationItem[] = [
  { to: "/", labelKey: "header.home", icon: Home },
  ...primaryNavigationItems,
  { to: "/about", labelKey: "footer.about", icon: Info },
  { to: "/rules", labelKey: "footer.rules", icon: BookOpen },
  { to: "/contact", labelKey: "footer.contact", icon: Mail },
  { to: "/faq", labelKey: "footer.faq", icon: HelpCircle },
  { to: "/privacy", labelKey: "footer.privacy", icon: ShieldCheck },
  { to: "/terms", labelKey: "footer.terms", icon: Scale },
  { to: "/cookies", labelKey: "footer.cookies", icon: Cookie },
];

export const languageOptions = [
  { value: "pt", shortLabel: "PT", label: "Portugues (PT)" },
  { value: "en", shortLabel: "EN", label: "English (EN)" },
  { value: "es", shortLabel: "ES", label: "Espanol (ES)" },
  { value: "fr", shortLabel: "FR", label: "Francais (FR)" },
];
import {
  BookOpen,
  Bell,
  Cookie,
  GraduationCap,
  HelpCircle,
  Home,
  Info,
  ListVideo,
  Mail,
  MessageCircle,
  Scale,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavigationItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
}

export const primaryNavigationItems: NavigationItem[] = [
  { to: "/", labelKey: "header.home", icon: Home },
  { to: "/videos", labelKey: "header.videos", icon: ListVideo },
  { to: "/playlists", labelKey: "header.playlists", icon: ListVideo },
  { to: "/submissions", labelKey: "header.imports", icon: UploadCloud },
  { to: "/facodi", labelKey: "header.facodi", icon: GraduationCap },
  { to: "/community", labelKey: "header.community", icon: Users },
];

export const projectNavigationItems: NavigationItem[] = [
  { to: "/curadoria", labelKey: "header.curation", icon: Sparkles },
  { to: "/editorial", labelKey: "header.editorialPortal", icon: ShieldCheck },
  { to: "/editor/board", labelKey: "header.editorialBoard", icon: ListVideo },
  { to: "/about", labelKey: "footer.about", icon: Info },
  { to: "/rules", labelKey: "footer.rules", icon: BookOpen },
  { to: "/faq", labelKey: "footer.faq", icon: HelpCircle },
  { to: "/contact", labelKey: "footer.contact", icon: Mail },
];

export const mobileNavigationGroups = [
  {
    key: "discover",
    labelKey: "header.sections.discover",
    items: [
      { to: "/", labelKey: "header.home", icon: Home },
      { to: "/videos", labelKey: "header.videos", icon: ListVideo },
      { to: "/playlists", labelKey: "header.playlists", icon: ListVideo },
      { to: "/submissions", labelKey: "header.imports", icon: UploadCloud },
    ],
  },
  {
    key: "learning",
    labelKey: "header.sections.learning",
    items: [
      { to: "/facodi", labelKey: "header.facodi", icon: GraduationCap },
      { to: "/curadoria", labelKey: "header.curation", icon: Sparkles },
    ],
  },
  {
    key: "community",
    labelKey: "header.sections.community",
    items: [
      { to: "/community", labelKey: "header.community", icon: Users },
      { to: "/messages", labelKey: "header.messages", icon: MessageCircle },
      { to: "/notifications", labelKey: "header.notifications", icon: Bell },
    ],
  },
  {
    key: "project",
    labelKey: "header.sections.project",
    items: projectNavigationItems,
  },
];

export const footerNavigationSections = [
  {
    key: "platform",
    labelKey: "footer.columns.platform.title",
    links: [
      { to: "/", labelKey: "header.home" },
      { to: "/videos", labelKey: "header.videos" },
      { to: "/playlists", labelKey: "header.playlists" },
      { to: "/submissions", labelKey: "header.imports" },
    ],
  },
  {
    key: "learning",
    labelKey: "footer.columns.learning.title",
    links: [
      { to: "/facodi", labelKey: "header.facodi" },
      { to: "/playlists?course=LESTI", labelKey: "footer.columns.learning.lesti" },
      { to: "/curadoria", labelKey: "header.curation" },
      { to: "/editor/apply", labelKey: "footer.columns.learning.editor" },
    ],
  },
  {
    key: "community",
    labelKey: "footer.columns.community.title",
    links: [
      { to: "/community", labelKey: "header.community" },
      { to: "/messages", labelKey: "header.messages" },
      { to: "/submit", labelKey: "header.submitVideo" },
      { to: "/contact", labelKey: "footer.contact" },
    ],
  },
  {
    key: "institutional",
    labelKey: "footer.columns.institutional.title",
    links: [
      { to: "/about", labelKey: "footer.about" },
      { to: "/rules", labelKey: "footer.rules" },
      { to: "/faq", labelKey: "footer.faq" },
      { to: "/privacy", labelKey: "footer.privacy" },
      { to: "/terms", labelKey: "footer.terms" },
      { to: "/cookies", labelKey: "footer.cookies" },
    ],
  },
];

export const languageOptions = [
  { value: "pt", shortLabel: "PT", label: "Portugues (PT)" },
  { value: "en", shortLabel: "EN", label: "English (EN)" },
  { value: "es", shortLabel: "ES", label: "Espanol (ES)" },
  { value: "fr", shortLabel: "FR", label: "Francais (FR)" },
];
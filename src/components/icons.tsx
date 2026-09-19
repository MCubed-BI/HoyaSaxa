import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CircleAlert,
  Clock,
  DollarSign,
  GraduationCap,
  Heart,
  House,
  Inbox,
  ListFilter,
  Mail,
  MapPin,
  MapPinned,
  Megaphone,
  MessageSquare,
  Newspaper,
  Phone,
  RefreshCw,
  Rss,
  Search,
  Send,
  UserRound,
  Users,
} from "lucide-react";
import { cn } from "cn";
import type { NavKey } from "@/lib/nav";

export const appIcons = {
  home: House,
  directory: Users,
  events: CalendarDays,
  giving: Heart,
  messages: MessageSquare,
  search: Search,
  filter: ListFilter,
  empty: Inbox,
  error: CircleAlert,
  alert: AlertTriangle,
  newsflash: Newspaper,
  feed: Rss,
  reports: BarChart3,
  blast: Megaphone,
  map: MapPinned,
  pin: MapPin,
  profile: UserRound,
  refresh: RefreshCw,
  alum: GraduationCap,
  mail: Mail,
  phone: Phone,
  send: Send,
  clock: Clock,
  dollar: DollarSign,
} as const;

export type AppIconName = keyof typeof appIcons;

const NAV_ICONS: Partial<Record<NavKey, AppIconName>> = {
  home: "home",
  directory: "directory",
  "portal-directory": "directory",
  events: "events",
  giving: "giving",
  fundraising: "giving",
  messages: "messages",
  message: "messages",
  "find-my-alum": "map",
  newsflash: "newsflash",
  reports: "reports",
  blast: "blast",
  sync: "refresh",
  alum: "alum",
  feed: "feed",
  profile: "profile",
  me: "profile",
};

export function AppIcon({
  name,
  className,
}: {
  name: AppIconName;
  className?: string;
}) {
  const Icon = appIcons[name];
  return <Icon className={cn("size-4", className)} aria-hidden />;
}

export function NavIcon({
  navKey,
  className,
}: {
  navKey: NavKey;
  className?: string;
}) {
  return <AppIcon name={NAV_ICONS[navKey] ?? "directory"} className={className} />;
}

export type { LucideIcon };

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Home,
  MessageSquareText,
  Ticket,
  UserRound,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/** Primary navigation. Mobile renders it as a bottom bar, desktop as a sidebar. */
export const primaryNav: readonly NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/bets", label: "My Bets", icon: Ticket },
  { href: "/analyst", label: "Analyst", icon: MessageSquareText },
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/profile", label: "Profile", icon: UserRound },
] as const;

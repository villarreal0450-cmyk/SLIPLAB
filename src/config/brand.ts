/**
 * Central branding config. Nothing else in the codebase should hardcode the
 * product name — import from here so a rename is a one-line change.
 */
export const brand = {
  name: "SlipLab",
  shortName: "SlipLab",
  tagline: "A smarter way to bet.",
  /** Short line from the logo lockup. */
  slogan: "Analyze the slip.",
  subtitle: "Analyze. Improve. Bet with more confidence.",
  description:
    "An AI sports analyst that reviews your picks and parlays before you place them.",
  /** Shown wherever we must remind users this is not a sportsbook. */
  disclaimer:
    "SlipLab is an analysis tool, not a sportsbook. It never places bets and never guarantees outcomes.",
  themeColor: "#0b0b0d",
} as const;

export type Brand = typeof brand;

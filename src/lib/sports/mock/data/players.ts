import type { Player } from "@/lib/types";
import { teamId } from "./teams";

const p = (
  id: string,
  team: string,
  name: string,
  position: Player["position"],
  jerseyNumber: number,
): Player => ({ id, sport: "nfl", teamId: teamId(team), name, position, jerseyNumber });

export const players: Player[] = [
  // Dallas
  p("dak-prescott", "DAL", "Dak Prescott", "QB", 4),
  p("ceedee-lamb", "DAL", "CeeDee Lamb", "WR", 88),
  p("george-pickens", "DAL", "George Pickens", "WR", 3),
  p("javonte-williams", "DAL", "Javonte Williams", "RB", 33),
  p("jake-ferguson", "DAL", "Jake Ferguson", "TE", 87),
  // Tampa Bay
  p("baker-mayfield", "TB", "Baker Mayfield", "QB", 6),
  p("mike-evans", "TB", "Mike Evans", "WR", 13),
  p("chris-godwin", "TB", "Chris Godwin", "WR", 14),
  p("emeka-egbuka", "TB", "Emeka Egbuka", "WR", 9),
  p("bucky-irving", "TB", "Bucky Irving", "RB", 7),
  // Atlanta
  p("michael-penix", "ATL", "Michael Penix Jr.", "QB", 9),
  p("bijan-robinson", "ATL", "Bijan Robinson", "RB", 7),
  p("drake-london", "ATL", "Drake London", "WR", 5),
  // New Orleans
  p("spencer-rattler", "NO", "Spencer Rattler", "QB", 2),
  p("alvin-kamara", "NO", "Alvin Kamara", "RB", 41),
  p("chris-olave", "NO", "Chris Olave", "WR", 12),
  // Kansas City
  p("patrick-mahomes", "KC", "Patrick Mahomes", "QB", 15),
  p("travis-kelce", "KC", "Travis Kelce", "TE", 87),
  p("rashee-rice", "KC", "Rashee Rice", "WR", 4),
  // Denver
  p("bo-nix", "DEN", "Bo Nix", "QB", 10),
  p("courtland-sutton", "DEN", "Courtland Sutton", "WR", 14),
  p("rj-harvey", "DEN", "RJ Harvey", "RB", 37),
];

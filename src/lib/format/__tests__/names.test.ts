import { describe, expect, it } from "vitest";
import { lastName } from "../names";

describe("lastName", () => {
  it("skips generational suffixes", () => {
    expect(lastName("Antoine Winfield Jr.")).toBe("Winfield");
    expect(lastName("Michael Penix Jr.")).toBe("Penix");
    expect(lastName("Dak Prescott")).toBe("Prescott");
    expect(lastName("Madonna")).toBe("Madonna");
  });
});

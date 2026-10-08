const SUFFIXES = new Set(["jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v"]);

/** "Antoine Winfield Jr." -> "Winfield". Used in analyst copy ("Winfield out"). */
export function lastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  while (parts.length > 1 && SUFFIXES.has(parts[parts.length - 1].toLowerCase())) parts.pop();
  return parts[parts.length - 1] ?? fullName;
}

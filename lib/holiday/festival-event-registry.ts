export type CanonicalFestivalEvent = {
  canonicalName: string;
  canonicalSlug: string;
  family: string | null;
  sourceName: string;
  aliasApplied: boolean;
};

const definitions = [
  ["Bhogali Bihu", "bhogali-bihu", "Bihu", []],
  ["Chhath Puja", "chhath-puja", null, ["Chaat Puja", "chaat-puja"]],
  ["Children's Day", "childrens-day", null, ["Children Day", "children-day"]],
  ["Christmas", "christmas", null, []],
  ["Diwali", "diwali", null, []],
  ["Durga Puja", "durga-puja", null, []],
  ["Dussehra", "dussehra", null, []],
  ["Eid", "eid", null, ["Eid Festival", "eid-festival"]],
  ["Father's Day", "fathers-day", null, []],
  ["Gandhi Jayanti", "gandhi-jayanti", null, []],
  ["Ganesh Chaturthi", "ganesh-chaturthi", null, []],
  ["Guru Nanak Jayanti", "guru-nanak-jayanti", null, ["GuruNanak Jayanti", "gurunanak-jayanti"]],
  ["Halloween", "halloween", null, []],
  ["Independence Day", "independence-day", null, []],
  ["International Yoga Day", "international-yoga-day", null, ["Yoga Day", "yoga-day"]],
  ["Kati Bihu", "kati-bihu", "Bihu", []],
  ["Mother's Day", "mothers-day", null, []],
  ["New Year", "new-year", null, ["Happy New Year", "happy-new-year"]],
  ["Onam", "onam", null, []],
  ["Pongal", "pongal", null, []],
  ["Raksha Bandhan", "raksha-bandhan", null, []],
  ["Rath Yatra", "rath-yatra", null, []],
  ["Republic Day", "republic-day", null, []],
  ["Rongali Bihu", "rongali-bihu", "Bihu", []],
  ["Saraswati Puja", "saraswati-puja", null, []],
  ["St. Patrick's Day", "st-patricks-day", null, ["St Patrick Day", "st-patrick-day"]],
  ["Thaipusam", "thaipusam", null, []],
  ["Valentine's Day", "valentines-day", null, ["Valentine Day", "valentine-day"]]
] as const;

const key = (value: string) =>
  value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "");

const byAlias = new Map<string, (typeof definitions)[number]>();
for (const definition of definitions) {
  for (const value of [definition[0], definition[1], ...definition[3]]) {
    byAlias.set(key(value), definition);
  }
}

export function canonicalFestivalEvent(sourceName: string): CanonicalFestivalEvent {
  const match = byAlias.get(key(sourceName));
  if (!match) {
    const canonicalSlug = sourceName.toLowerCase().normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return { canonicalName: sourceName.trim(), canonicalSlug, family: null,
      sourceName, aliasApplied: false };
  }
  return {
    canonicalName: match[0], canonicalSlug: match[1], family: match[2],
    sourceName, aliasApplied: key(sourceName) !== key(match[0])
  };
}

export const AVAILABLE_CANONICAL_FESTIVALS = definitions.map((entry) => ({
  canonicalName: entry[0], canonicalSlug: entry[1], family: entry[2]
}));

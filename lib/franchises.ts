export interface FranchiseRule {
  group: string;
  companies?: RegExp[];
  collections?: RegExp[];
  keywords?: RegExp[];
  /** Skip the company match when the collection matches (e.g. Lucasfilm also makes Indiana Jones). */
  unlessCollection?: RegExp;
}

// Add a line here to auto-detect another franchise.
export const FRANCHISES: FranchiseRule[] = [
  {
    group: "Marvel",
    companies: [/^marvel (studios|entertainment)$/i],
    keywords: [/^marvel cinematic universe$/i],
  },
  {
    group: "Star Wars",
    companies: [/^lucasfilm/i],
    collections: [/star wars/i],
    keywords: [/^star wars$/i],
    unlessCollection: /indiana jones/i,
  },
  {
    group: "DC",
    companies: [/^dc (entertainment|studios|films|comics)$/i],
    keywords: [/^dc extended universe$/i, /^dc comics$/i],
  },
  {
    group: "Harry Potter",
    collections: [/harry potter|wizarding world|fantastic beasts/i],
    keywords: [/^harry potter$/i],
  },
  {
    group: "Lord of the Rings",
    collections: [/lord of the rings|the hobbit/i],
    keywords: [/^middle-earth/i],
  },
];

export interface TitleFacts {
  companies: string[];
  collection: string | null;
  keywords: string[];
}

export function detectGroups(facts: TitleFacts): string[] {
  const any = (res: RegExp[] | undefined, values: string[]) =>
    !!res && values.some((v) => res.some((re) => re.test(v)));
  const collection = facts.collection ? [facts.collection] : [];

  return FRANCHISES.filter((rule) => {
    const blocked = rule.unlessCollection && collection.some((c) => rule.unlessCollection!.test(c));
    return (
      (!blocked && any(rule.companies, facts.companies)) ||
      any(rule.collections, collection) ||
      any(rule.keywords, facts.keywords)
    );
  }).map((r) => r.group);
}

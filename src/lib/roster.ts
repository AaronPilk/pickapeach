// Shared by the site build and the edge Worker, so both agree on every slug.
// Agency girls (from the sheet) keep their slugs. An approved self-serve profile whose
// slug is already taken gets "-2", "-3"… instead of silently disappearing.
type Row = { slug: string; fansUrl: string; age?: number };

export function mergeRoster<T extends Row>(agency: T[], selfServe: T[]): T[] {
  const taken = new Set(agency.map((c) => c.slug));
  const extra: T[] = [];
  for (const c of selfServe) {
    if (!c?.slug || (c.age ?? 0) < 18) continue;
    let slug = c.slug;
    for (let i = 2; taken.has(slug); i++) slug = `${c.slug}-${i}`;
    taken.add(slug);
    extra.push(slug === c.slug ? c : { ...c, slug });
  }
  return [...agency, ...extra];
}

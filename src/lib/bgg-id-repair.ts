// Logic for repairing Game.bggId values that were generated randomly by the old manual-add
// route (random 0..1,000,000 on a globally unique column). Kept free of I/O so it can be
// unit tested; scripts/fix-manual-bgg-ids.ts wires it to BGG and the database.

export interface GameRow {
  id: string;
  userId: string;
  title: string;
  bggId: number;
  yearPublished: number | null;
}

// What BGG says a given id is (absent from the map when BGG has no such item)
export interface BggInfo {
  id: number;
  names: string[]; // primary name first, then alternates
  year?: number;
}

export type ResolveResult =
  | { status: 'match'; id: number; name: string }
  | { status: 'ambiguous'; ids: number[] }
  | { status: 'none' };

export type Resolver = (title: string, year: number | null) => Promise<ResolveResult>;

export interface PlanEntry {
  gameId: string;
  userId: string;
  title: string;
  oldBggId: number;
  oldBggName: string | null; // what BGG calls the old id, so a human can spot a genuine link
  newBggId: number;
  kind: 'linked' | 'unlinked';
  reason: string;
}

const ENTITIES: Record<string, string> = { '&amp;': '&', '&quot;': '"', '&apos;': "'", '&#039;': "'", '&#39;': "'", '&lt;': '<', '&gt;': '>' };

export function normalizeTitle(title: string): string {
  let t = title;
  for (const [entity, char] of Object.entries(ENTITIES)) t = t.split(entity).join(char);
  return t
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// "Baltic Empires: The Northern Wars of 1558-1721" -> "baltic empires"
function mainTitle(title: string): string {
  return normalizeTitle(title.split(/\s*[:–—]\s*|\s+-\s+/)[0]);
}

// Exact match (used to pick a NEW id: must be unambiguous)
export function exactMatch(title: string, names: string[]): boolean {
  const t = normalizeTitle(title);
  return !!t && names.some(n => normalizeTitle(n) === t);
}

// Lenient match (used to decide whether the EXISTING id is genuine): also accepts a title
// that differs from BGG's only by its subtitle, so correct links are not needlessly changed.
export function looseMatch(title: string, names: string[]): boolean {
  if (exactMatch(title, names)) return true;
  const t = mainTitle(title);
  return !!t && names.some(n => mainTitle(n) === t);
}

export async function buildPlan(opts: {
  games: GameRow[];
  infoById: Map<number, BggInfo>;
  resolve: Resolver;
  usedIds: Set<number>; // every bggId currently in the table (any user)
  randomUnlinkedId: () => number;
}): Promise<{ plan: PlanEntry[]; kept: number }> {
  const { games, infoById, resolve, usedIds, randomUnlinkedId } = opts;
  const taken = new Set(usedIds);
  const plan: PlanEntry[] = [];
  let kept = 0;

  const newUnlinkedId = () => {
    let id = randomUnlinkedId();
    while (taken.has(id)) id = randomUnlinkedId();
    taken.add(id);
    return id;
  };

  for (const game of games) {
    if (game.bggId <= 0) continue; // already unlinked

    const info = infoById.get(game.bggId);
    if (info && looseMatch(game.title, info.names)) {
      kept++;
      continue;
    }

    const base = {
      gameId: game.id,
      userId: game.userId,
      title: game.title,
      oldBggId: game.bggId,
      oldBggName: info ? info.names[0] ?? null : null,
    };
    const why = info
      ? `id ${game.bggId} is "${info.names[0]}" on BGG, not this game`
      : `id ${game.bggId} does not exist on BGG`;

    const found = await resolve(game.title, game.yearPublished);
    if (found.status === 'match' && !taken.has(found.id)) {
      taken.add(found.id);
      plan.push({ ...base, newBggId: found.id, kind: 'linked', reason: `${why}; exact BGG match "${found.name}" is ${found.id}` });
    } else if (found.status === 'match') {
      plan.push({ ...base, newBggId: newUnlinkedId(), kind: 'unlinked', reason: `${why}; real id ${found.id} is already used by another row` });
    } else if (found.status === 'ambiguous') {
      plan.push({ ...base, newBggId: newUnlinkedId(), kind: 'unlinked', reason: `${why}; several BGG games match (${found.ids.join(', ')})` });
    } else {
      plan.push({ ...base, newBggId: newUnlinkedId(), kind: 'unlinked', reason: `${why}; no exact title match on BGG` });
    }
  }

  return { plan, kept };
}

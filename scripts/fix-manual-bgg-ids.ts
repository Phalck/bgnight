#!/usr/bin/env ts-node
/**
 * Repair Game.bggId values created by the old manual-add route, which gave every hand-added
 * game a random id in 0..1,000,000. Bulk Update from BGG treats any bggId > 0 as a real BGG
 * id, so those games would get another game's data.
 *
 * For each game with bggId > 0 the script asks BGG what that id is. If BGG's name matches the
 * game's title the id is genuine and left alone. Otherwise the game gets:
 *   - the real BGG id, when BGG has exactly one exact title match ("linked"), or
 *   - a random negative id, meaning "not linked to BGG" ("unlinked"; Bulk Update then
 *     searches by title, exactly as it does for any other unlinked game).
 *
 * Nothing is written by default. Workflow:
 *   1. Dry run   - writes a plan file for you to review:
 *        DATABASE_URL=... npm run fix:bggids -- --plan bgnight-bgg-id-plan.json
 *   2. Apply     - changes ONLY the games listed in the plan file (edit or delete entries to skip them):
 *        DATABASE_URL=... npm run fix:bggids -- --apply bgnight-bgg-id-plan.json
 *
 * Offline check of the matching against real BGG, without a database:
 *        npm run fix:bggids -- --from-json rows.json --plan out.json
 *   where rows.json is [{ "id", "userId", "title", "bggId", "yearPublished" }, ...]
 *
 * Safe to re-run: entries are only applied if the game still has the bggId the plan saw.
 */

import * as fs from 'fs';
import { XMLParser } from 'fast-xml-parser';
import { bggHeaders } from '../src/lib/bgg-headers';
import {
  BggInfo,
  GameRow,
  PlanEntry,
  ResolveResult,
  buildPlan,
  exactMatch,
} from '../src/lib/bgg-id-repair';

const BGG = 'https://boardgamegeek.com/xmlapi2';
const REQUEST_GAP_MS = 2000;
const THING_BATCH = 20;

const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', parseAttributeValue: true, trimValues: true });
const asArray = <T>(v: T | T[] | undefined | null): T[] => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function bggGet(path: string): Promise<any> {
  for (let attempt = 1; attempt <= 5; attempt++) {
    await sleep(REQUEST_GAP_MS);
    const res = await fetch(`${BGG}/${path}`, { headers: bggHeaders() });
    if (res.status === 429 || res.status === 202) {
      console.log(`  BGG asked us to slow down (${res.status}), waiting...`);
      await sleep(10_000 * attempt);
      continue;
    }
    if (!res.ok) throw new Error(`BGG ${res.status} for ${path}`);
    return xml.parse(await res.text());
  }
  throw new Error(`BGG kept rate limiting ${path}`);
}

async function fetchInfo(ids: number[]): Promise<Map<number, BggInfo>> {
  const map = new Map<number, BggInfo>();
  for (let i = 0; i < ids.length; i += THING_BATCH) {
    const batch = ids.slice(i, i + THING_BATCH);
    console.log(`  checking ids ${i + 1}-${i + batch.length} of ${ids.length} on BGG`);
    const parsed = await bggGet(`thing?id=${batch.join(',')}`);
    for (const item of asArray<any>(parsed?.items?.item)) {
      const names = asArray<any>(item.name);
      const primary = names.find(n => n['@_type'] === 'primary') ?? names[0];
      const ordered = [primary, ...names.filter(n => n !== primary)].map(n => String(n?.['@_value'] ?? '')).filter(Boolean);
      map.set(Number(item['@_id']), { id: Number(item['@_id']), names: ordered, year: Number(item.yearpublished?.['@_value']) || undefined });
    }
  }
  return map;
}

async function resolveByTitle(title: string, year: number | null): Promise<ResolveResult> {
  const parsed = await bggGet(`search?query=${encodeURIComponent(title)}&type=boardgame,boardgameexpansion&exact=1`);
  const hits = asArray<any>(parsed?.items?.item)
    .map(item => {
      const names = asArray<any>(item.name);
      const primary = names.find(n => n['@_type'] === 'primary') ?? names[0];
      return { id: Number(item['@_id']), name: String(primary?.['@_value'] ?? ''), year: Number(item.yearpublished?.['@_value']) || undefined };
    })
    .filter(h => h.id && exactMatch(title, [h.name]));

  if (hits.length === 1) return { status: 'match', id: hits[0].id, name: hits[0].name };
  if (hits.length > 1) {
    const sameYear = year ? hits.filter(h => h.year === year) : [];
    if (sameYear.length === 1) return { status: 'match', id: sameYear[0].id, name: sameYear[0].name };
    return { status: 'ambiguous', ids: hits.map(h => h.id) };
  }
  return { status: 'none' };
}

const randomUnlinkedId = () => -(Math.floor(Math.random() * 2_000_000_000) + 1);

function dbHost(): string {
  try { return new URL(process.env.DATABASE_URL || '').host || '(unknown)'; } catch { return '(unparseable DATABASE_URL)'; }
}

async function getPrisma() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  const { PrismaClient } = await import('@prisma/client');
  return new PrismaClient();
}

function printPlan(plan: PlanEntry[], kept: number, total: number) {
  console.log(`\n${total} games with a positive BGG id: ${kept} genuine (left alone), ${plan.length} need repair\n`);
  for (const p of plan) {
    console.log(`  [${p.kind.padEnd(8)}] "${p.title}"`);
    console.log(`             ${p.oldBggId} -> ${p.newBggId}   (${p.reason})`);
  }
  const linked = plan.filter(p => p.kind === 'linked').length;
  console.log(`\n${linked} would be linked to their real BGG id, ${plan.length - linked} would become unlinked (negative id).`);
}

async function planMode() {
  const planFile = arg('--plan') || 'bgnight-bgg-id-plan.json';
  const fromJson = arg('--from-json');

  let games: GameRow[];
  let prisma: Awaited<ReturnType<typeof getPrisma>> | null = null;
  if (fromJson) {
    games = JSON.parse(fs.readFileSync(fromJson, 'utf8'));
    console.log(`Using ${games.length} games from ${fromJson} (no database)`);
  } else {
    prisma = await getPrisma();
    console.log(`Reading games from database host: ${dbHost()}  (read-only)`);
    games = await prisma.game.findMany({ select: { id: true, userId: true, title: true, bggId: true, yearPublished: true } });
  }

  const positive = games.filter(g => g.bggId > 0);
  const infoById = await fetchInfo([...new Set(positive.map(g => g.bggId))]);

  // Resolve lazily: only games whose id is not genuine reach the title search
  let searched = 0;
  const { plan, kept } = await buildPlan({
    games,
    infoById,
    usedIds: new Set(games.map(g => g.bggId)),
    randomUnlinkedId,
    resolve: (title, year) => {
      console.log(`  searching BGG for "${title}" (${++searched})`);
      return resolveByTitle(title, year);
    },
  });

  printPlan(plan, kept, positive.length);
  fs.writeFileSync(planFile, JSON.stringify(plan, null, 2));
  console.log(`\nPlan written to ${planFile}. Nothing was changed in the database.`);
  if (plan.length) console.log(`Review it, then apply with:  npm run fix:bggids -- --apply ${planFile}`);
  await prisma?.$disconnect();
}

async function applyMode(planFile: string) {
  const plan: PlanEntry[] = JSON.parse(fs.readFileSync(planFile, 'utf8'));
  const prisma = await getPrisma();
  console.log(`Applying ${plan.length} changes to database host: ${dbHost()}`);

  let done = 0, skipped = 0, failed = 0;
  for (const p of plan) {
    try {
      // Only if the game still has the id the plan was made from
      const result = await prisma.game.updateMany({
        where: { id: p.gameId, bggId: p.oldBggId },
        data: { bggId: p.newBggId },
      });
      if (result.count === 1) { done++; console.log(`  updated  "${p.title}": ${p.oldBggId} -> ${p.newBggId}`); }
      else { skipped++; console.log(`  skipped  "${p.title}": no longer has bggId ${p.oldBggId}`); }
    } catch (error: any) {
      failed++;
      console.log(`  FAILED   "${p.title}": ${error.code === 'P2002' ? `bggId ${p.newBggId} is already taken (re-run the dry run)` : error.message}`);
    }
  }
  console.log(`\nDone: ${done} updated, ${skipped} skipped, ${failed} failed.`);
  await prisma.$disconnect();
}

async function main() {
  const applyFile = arg('--apply');
  if (applyFile) return applyMode(applyFile);
  return planMode();
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});

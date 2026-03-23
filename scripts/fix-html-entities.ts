#!/usr/bin/env ts-node
/**
 * Database cleanup script to fix HTML entities in game titles and other fields
 * 
 * Usage:
 *   Dry run (preview):  npx ts-node scripts/fix-html-entities.ts --dry-run
 *   Apply changes:      npx ts-node scripts/fix-html-entities.ts --apply
 * 
 * Or if you prefer JavaScript:
 *   node scripts/fix-html-entities.js --dry-run
 *   node scripts/fix-html-entities.js --apply
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// HTML entity decoder function
function decodeHtmlEntities(text: string): string {
  if (!text || typeof text !== 'string') return text;
  
  let decoded = text;
  
  // Replace decimal numeric entities (e.g., &#039; -> ')
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
    return String.fromCharCode(parseInt(dec, 10));
  });
  
  // Replace hexadecimal entities (e.g., &#x27; -> ')
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  
  // Replace named entities
  const namedEntities: { [key: string]: string } = {
    '&quot;': '"',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&apos;': "'",
    '&nbsp;': ' ',
    '&ndash;': '–',
    '&mdash;': '—',
    '&hellip;': '…',
    '&laquo;': '«',
    '&raquo;': '»',
  };
  
  for (const [entity, char] of Object.entries(namedEntities)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char);
  }
  
  // Handle curly quotes separately to avoid syntax issues
  decoded = decoded.replace(/&lsquo;|&rsquo;/g, "'");
  decoded = decoded.replace(/&ldquo;|&rdquo;/g, '"');
  
  return decoded;
}

// Fields to check and fix
const fieldsToFix = [
  'title',
  'description',
  'mechanics',
  'categories',
  'designers',
  'publishers',
] as const;

interface GameWithEntities {
  id: string;
  title: string;
  description: string | null;
  mechanics: string;
  categories: string;
  designers: string;
  publishers: string;
}

interface ChangeLog {
  id: string;
  title: string;
  changes: { field: string; from: string; to: string }[];
}

async function findGamesWithEntities(): Promise<GameWithEntities[]> {
  // Find games where any field contains & character (potential HTML entity)
  const games = await prisma.game.findMany({
    where: {
      OR: [
        { title: { contains: '&' } },
        { description: { contains: '&' } },
        { mechanics: { contains: '&' } },
        { categories: { contains: '&' } },
        { designers: { contains: '&' } },
        { publishers: { contains: '&' } },
      ],
    },
    select: {
      id: true,
      title: true,
      description: true,
      mechanics: true,
      categories: true,
      designers: true,
      publishers: true,
    },
  });
  
  return games;
}

function processGame(game: GameWithEntities): { hasChanges: boolean; changes: ChangeLog } {
  const changes: ChangeLog = {
    id: game.id,
    title: game.title,
    changes: [],
  };
  
  const fieldValues: Record<string, string | null> = {
    title: game.title,
    description: game.description,
    mechanics: game.mechanics,
    categories: game.categories,
    designers: game.designers,
    publishers: game.publishers,
  };
  
  for (const field of fieldsToFix) {
    const original = fieldValues[field];
    if (original && original.includes('&')) {
      const decoded = decodeHtmlEntities(original);
      if (decoded !== original) {
        changes.changes.push({
          field,
          from: original,
          to: decoded,
        });
      }
    }
  }
  
  return {
    hasChanges: changes.changes.length > 0,
    changes,
  };
}

async function dryRun(games: GameWithEntities[]): Promise<void> {
  console.log('\n🔍 DRY RUN - Preview of changes\n');
  console.log(`Found ${games.length} games with potential HTML entities\n`);
  
  let gamesWithChanges = 0;
  let totalChanges = 0;
  
  for (const game of games) {
    const { hasChanges, changes } = processGame(game);
    
    if (hasChanges) {
      gamesWithChanges++;
      totalChanges += changes.changes.length;
      
      console.log(`Game: "${changes.title}"`);
      console.log(`ID: ${changes.id}`);
      console.log('Changes:');
      
      for (const change of changes.changes) {
        console.log(`  ${change.field}:`);
        console.log(`    From: "${change.from.substring(0, 100)}${change.from.length > 100 ? '...' : ''}"`);
        console.log(`    To:   "${change.to.substring(0, 100)}${change.to.length > 100 ? '...' : ''}"`);
      }
      
      console.log('');
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`  Games scanned: ${games.length}`);
  console.log(`  Games with changes: ${gamesWithChanges}`);
  console.log(`  Total field changes: ${totalChanges}`);
  
  if (totalChanges === 0) {
    console.log('\n✅ No HTML entities found that need fixing!');
  } else {
    console.log('\n⚠️  Run with --apply to make these changes');
  }
}

async function applyChanges(games: GameWithEntities[]): Promise<void> {
  console.log('\n📝 Applying changes to database...\n');
  
  let gamesUpdated = 0;
  let totalFieldUpdates = 0;
  let errors = 0;
  
  for (const game of games) {
    const { hasChanges, changes } = processGame(game);
    
    if (hasChanges) {
      try {
        const updateData: Partial<GameWithEntities> = {};
        
        for (const change of changes.changes) {
          updateData[change.field as keyof GameWithEntities] = change.to;
          totalFieldUpdates++;
        }
        
        await prisma.game.update({
          where: { id: game.id },
          data: updateData,
        });
        
        gamesUpdated++;
        console.log(`✓ Updated: "${changes.title}" (${changes.changes.length} field(s))`);
      } catch (error) {
        errors++;
        console.error(`✗ Failed to update: "${changes.title}" - ${error}`);
      }
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`  Games scanned: ${games.length}`);
  console.log(`  Games updated: ${gamesUpdated}`);
  console.log(`  Total field updates: ${totalFieldUpdates}`);
  console.log(`  Errors: ${errors}`);
  
  if (errors > 0) {
    console.log('\n⚠️  Some updates failed. Check the error messages above.');
  } else if (gamesUpdated > 0) {
    console.log('\n✅ All changes applied successfully!');
  } else {
    console.log('\n✅ No changes were needed.');
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isApply = args.includes('--apply');
  
  if (!isDryRun && !isApply) {
    console.log(`
Usage:
  npx ts-node scripts/fix-html-entities.ts --dry-run   Preview changes without modifying database
  npx ts-node scripts/fix-html-entities.ts --apply     Apply changes to database

This script fixes HTML entities (like &#039;, &quot;, &amp;) in game fields:
  - title
  - description
  - mechanics
  - categories
  - designers
  - publishers
`);
    process.exit(1);
  }
  
  try {
    console.log('🔌 Connecting to database...');
    await prisma.$connect();
    console.log('✓ Connected\n');
    
    console.log('🔍 Scanning for games with HTML entities...');
    const games = await findGamesWithEntities();
    
    if (games.length === 0) {
      console.log('\n✅ No games with HTML entities found!');
      return;
    }
    
    if (isDryRun) {
      await dryRun(games);
    } else if (isApply) {
      await applyChanges(games);
    }
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

main();

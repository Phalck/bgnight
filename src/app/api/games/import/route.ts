import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface CSVRow {
  objectname: string;
  objectid: string;
  minplayers: string;
  maxplayers: string;
  playingtime: string;
  maxplaytime: string;
  minplaytime: string;
  yearpublished: string;
  itemtype: string;
}

function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  
  const entities: { [key: string]: string } = {
    '&quot;': '"',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&apos;': "'",
    '&#39;': "'",
    '&#039;': "'",
    '&nbsp;': ' ',
    '&ndash;': '–',
    '&mdash;': '—',
    '&lsquo;': ''',
    '&rsquo;': ''',
    '&ldquo;': '"',
    '&rdquo;': '"',
    '&hellip;': '…',
  };
  
  let decoded = text;
  
  // Replace named entities
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char);
  }
  
  // Replace numeric entities (decimal and hexadecimal)
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
    return String.fromCharCode(parseInt(dec, 10));
  });
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  
  return decoded;
}

function parseCSV(text: string): CSVRow[] {
  const lines = text.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error('CSV file is empty or has no data rows');
  }
  
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
  
  // Validate required headers
  const requiredHeaders = ['objectname', 'objectid'];
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
  }
  
  const rows: CSVRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    rows.push(row as unknown as CSVRow);
  }
  
  return rows;
}

export async function POST(request: NextRequest) {
  console.log('CSV Import API called');
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.error('Import failed: No session');
      return NextResponse.json({ 
        error: 'Unauthorized', 
        details: 'Please log in to import games' 
      }, { status: 401 });
    }

    console.log('Session OK, user:', session.user.id);
    console.log('Content-Type:', request.headers.get('content-type'));

    let formData: FormData;
    try {
      formData = await request.formData();
      console.log('FormData parsed successfully');
    } catch (err: any) {
      console.error('Import failed: Cannot parse form data', err);
      return NextResponse.json({ 
        error: 'Invalid request', 
        details: `Could not parse uploaded file: ${err.message}` 
      }, { status: 400 });
    }
    
    const file = formData.get('file') as File;
    
    if (!file) {
      console.error('No file in form data');
      return NextResponse.json({ 
        error: 'No file provided',
        details: 'Please select a CSV file to upload'
      }, { status: 400 });
    }

    console.log('File received:', file.name, 'Size:', file.size, 'Type:', file.type);

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json({ 
        error: 'Invalid file type',
        details: 'Please upload a CSV file' 
      }, { status: 400 });
    }

    let text: string;
    try {
      text = await file.text();
      console.log('File text length:', text.length);
    } catch (err: any) {
      console.error('Import failed: Cannot read file', err);
      return NextResponse.json({ 
        error: 'Cannot read file',
        details: 'The file appears to be corrupted' 
      }, { status: 400 });
    }
    
    let rows: CSVRow[];
    try {
      rows = parseCSV(text);
      console.log('CSV parsed, rows:', rows.length);
    } catch (err: any) {
      console.error('Import failed: CSV parsing error', err);
      return NextResponse.json({ 
        error: 'CSV parsing failed',
        details: err.message || 'Unable to parse CSV file. Please ensure it is a valid BGG export.'
      }, { status: 400 });
    }
    
    if (rows.length === 0) {
      return NextResponse.json({ 
        error: 'No data found',
        details: 'The CSV file appears to be empty' 
      }, { status: 400 });
    }
    
    const gamesToImport = rows
      .filter(row => row.objectid && row.objectname)
      .filter(row => row.itemtype !== 'expansion');

    console.log('Games to import:', gamesToImport.length);

    if (gamesToImport.length === 0) {
      return NextResponse.json({ 
        error: 'No valid games found',
        details: 'No valid games found in the CSV. Make sure it is a BGG collection export.' 
      }, { status: 400 });
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of gamesToImport) {
      try {
        const bggId = parseInt(row.objectid, 10);
        
        if (isNaN(bggId)) {
          errors.push(`Invalid BGG ID for ${row.objectname}`);
          continue;
        }
        
        const existingGame = await prisma.game.findFirst({
          where: { bggId, userId: session.user.id },
        });

        if (existingGame) {
          skipped++;
          continue;
        }

        const minPlayers = parseInt(row.minplayers, 10) || 2;
        const maxPlayers = parseInt(row.maxplayers, 10) || 4;
        const minPlayTime = parseInt(row.minplaytime, 10) || parseInt(row.playingtime, 10) || 30;
        const maxPlayTime = parseInt(row.maxplaytime, 10) || parseInt(row.playingtime, 10) || minPlayTime;
        const yearPublished = parseInt(row.yearpublished, 10) || null;

        await prisma.game.create({
          data: {
            bggId,
            title: decodeHtmlEntities(row.objectname.replace(/"/g, '')),
            thumbnail: null,
            image: null,
            minPlayers,
            maxPlayers,
            minPlayTime: minPlayTime || null,
            maxPlayTime: maxPlayTime || null,
            yearPublished: yearPublished || null,
            description: null,
            mechanics: '',
            categories: '',
            designers: '',
            publishers: '',
            userId: session.user.id,
          },
        });

        imported++;
      } catch (err: any) {
        console.error(`Failed to import ${row.objectname}:`, err);
        errors.push(`Failed to import ${row.objectname}: ${err.message}`);
      }
    }

    console.log(`Import complete: ${imported} imported, ${skipped} skipped`);

    return NextResponse.json({
      imported,
      skipped,
      errors: errors.slice(0, 5),
      total: gamesToImport.length,
      success: imported > 0,
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message || 'An unexpected error occurred while importing'
    }, { status: 500 });
  }
}
import { BGGGame } from './bgg';

export interface GameChange {
  field: string;
  before: any;
  after: any;
}

export function calculateChanges(
  before: Record<string, any>,
  after: Record<string, any>
): GameChange[] {
  const changes: GameChange[] = [];
  
  const fieldsToCompare = [
    'title',
    'description',
    'minPlayers',
    'maxPlayers',
    'minPlayTime',
    'maxPlayTime',
    'yearPublished',
    'mechanics',
    'categories',
    'designers',
    'publishers',
    'complexity',
    'bggRating'
  ];
  
  for (const field of fieldsToCompare) {
    const beforeVal = before[field];
    const afterVal = after[field];
    
    // Handle arrays (compare as strings)
    if (Array.isArray(beforeVal) || Array.isArray(afterVal)) {
      const beforeStr = JSON.stringify(beforeVal || []);
      const afterStr = JSON.stringify(afterVal || []);
      if (beforeStr !== afterStr) {
        changes.push({ field, before: beforeVal, after: afterVal });
      }
    } 
    // Handle primitives
    else if (beforeVal !== afterVal) {
      changes.push({ field, before: beforeVal, after: afterVal });
    }
  }
  
  return changes;
}

export function formatFieldValue(field: string, value: any): string {
  if (value === null || value === undefined) return 'Not set';
  
  switch (field) {
    case 'mechanics':
    case 'categories':
    case 'designers':
    case 'publishers':
      return Array.isArray(value) ? value.join(', ') : String(value);
    case 'complexity':
      return `${value}/5`;
    case 'bggRating':
      return `${value}/10`;
    default:
      return String(value);
  }
}

export function hasChanges(changes: GameChange[]): boolean {
  return changes.length > 0;
}
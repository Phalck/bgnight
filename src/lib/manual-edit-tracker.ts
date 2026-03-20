import { prisma } from './prisma';

export const TRACKABLE_FIELDS = [
  'title',
  'description',
  'minPlayers',
  'maxPlayers',
  'minPlayTime',
  'maxPlayTime',
  'mechanics',
  'categories',
  'designers',
  'publishers'
] as const;

export type TrackableField = typeof TRACKABLE_FIELDS[number];

export async function trackManualEdit(
  gameId: string,
  userId: string,
  field: TrackableField
): Promise<void> {
  const existing = await prisma.manualEditTracking.findUnique({
    where: { gameId }
  });
  
  if (existing) {
    // Add field if not already tracked
    const fields = JSON.parse(existing.editedFields) as string[];
    if (!fields.includes(field)) {
      await prisma.manualEditTracking.update({
        where: { gameId },
        data: {
          editedFields: JSON.stringify([...fields, field]),
          editedAt: new Date()
        }
      });
    }
  } else {
    // Create new tracking record
    await prisma.manualEditTracking.create({
      data: {
        gameId,
        userId,
        editedFields: JSON.stringify([field])
      }
    });
  }
}

export async function getManuallyEditedGames(userId: string): Promise<{
  gameId: string;
  editedFields: string[];
  editedAt: Date;
}[]> {
  const records = await prisma.manualEditTracking.findMany({
    where: { userId },
    orderBy: { editedAt: 'desc' }
  });
  
  return records.map(r => ({
    gameId: r.gameId,
    editedFields: JSON.parse(r.editedFields) as string[],
    editedAt: r.editedAt
  }));
}

export async function clearManualEditTracking(gameId: string): Promise<void> {
  await prisma.manualEditTracking.deleteMany({
    where: { gameId }
  });
}

export async function isManuallyEdited(gameId: string): Promise<boolean> {
  const record = await prisma.manualEditTracking.findUnique({
    where: { gameId }
  });
  return !!record;
}
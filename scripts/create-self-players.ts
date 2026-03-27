import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createSelfPlayersForExistingUsers() {
  try {
    console.log('Starting self-player migration...\n');
    
    // Find all users without a self-player
    const users = await prisma.user.findMany({
      where: {
        players: {
          none: {
            isSelfPlayer: true,
          },
        },
      },
    });

    console.log(`Found ${users.length} users without self-players\n`);

    for (const user of users) {
      // Extract email prefix
      const emailPrefix = user.email.split('@')[0];
      
      // Check if user already has a player with email prefix name
      const existingPlayer = await prisma.player.findFirst({
        where: {
          userId: user.id,
          name: emailPrefix,
        },
      });

      if (existingPlayer) {
        // Update existing player to be the self-player
        await prisma.player.update({
          where: { id: existingPlayer.id },
          data: {
            isSelfPlayer: true,
            linkedUserId: user.id,
          },
        });
        console.log(`✓ Updated existing player "${emailPrefix}" for ${user.email}`);
      } else {
        // Create new self-player
        await prisma.player.create({
          data: {
            name: emailPrefix,
            userId: user.id,
            linkedUserId: user.id,
            isSelfPlayer: true,
          },
        });
        console.log(`✓ Created self-player "${emailPrefix}" for ${user.email}`);
      }
    }

    console.log('\n✅ Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createSelfPlayersForExistingUsers();

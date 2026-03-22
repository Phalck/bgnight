import { GET as backupCollection } from '@/app/api/backup/collection/route';
import { GET as backupPlays } from '@/app/api/backup/plays/route';
import { POST as restoreCollection } from '@/app/api/restore/collection/route';
import { POST as restorePlays } from '@/app/api/restore/plays/route';
import { getServerSession } from 'next-auth/next';

// Mock next-auth
const mockGetServerSession = jest.fn();
jest.mock('next-auth/next', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

// Mock prisma
const mockGameFindMany = jest.fn();
const mockGameCreate = jest.fn();
const mockGameDeleteMany = jest.fn();
const mockPlayLogFindMany = jest.fn();
const mockPlayLogCreate = jest.fn();
const mockPlayLogFindFirst = jest.fn();
const mockPlayerFindMany = jest.fn();
const mockPlayerCreate = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    game: {
      findMany: (...args: unknown[]) => mockGameFindMany(...args),
      create: (...args: unknown[]) => mockGameCreate(...args),
      deleteMany: (...args: unknown[]) => mockGameDeleteMany(...args),
    },
    playLog: {
      findMany: (...args: unknown[]) => mockPlayLogFindMany(...args),
      create: (...args: unknown[]) => mockPlayLogCreate(...args),
      findFirst: (...args: unknown[]) => mockPlayLogFindFirst(...args),
    },
    player: {
      findMany: (...args: unknown[]) => mockPlayerFindMany(...args),
      create: (...args: unknown[]) => mockPlayerCreate(...args),
    },
  },
}));

// Mock session data
const mockSession = {
  user: {
    id: 'user-1',
    email: 'test@example.com',
  },
};

describe('Backup and Restore API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue(mockSession);
  });

  describe('Backup Collection - GET /api/backup/collection', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValueOnce(null);

      const response = await backupCollection(new Request('http://localhost:3000/api/backup/collection'));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should backup collection with all fields including new schema fields', async () => {
      const mockGames = [
        {
          bggId: 12345,
          title: 'Test Game',
          thumbnail: 'http://example.com/thumb.jpg',
          image: 'http://example.com/image.jpg',
          minPlayers: 2,
          maxPlayers: 4,
          minPlayTime: 30,
          maxPlayTime: 60,
          yearPublished: 2020,
          description: 'A test game',
          mechanics: JSON.stringify(['Card Drafting', 'Hand Management']),
          categories: JSON.stringify(['Strategy', 'Card Game']),
          designers: JSON.stringify(['John Doe']),
          publishers: JSON.stringify(['Test Publisher']),
          artists: JSON.stringify(['Jane Artist']),
          minAge: 12,
          complexity: 2.5,
          bggRating: 7.5,
          bggRatingsCount: 1000,
          bggRank: 500,
        },
      ];

      mockGameFindMany.mockResolvedValueOnce(mockGames);

      const response = await backupCollection(new Request('http://localhost:3000/api/backup/collection'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.exportType).toBe('collection');
      expect(data.version).toBe('1.0');
      expect(data.user).toBe('test@example.com');
      expect(data.gameCount).toBe(1);
      expect(data.games).toHaveLength(1);

      // Verify all fields are present
      const game = data.games[0];
      expect(game.bggId).toBe(12345);
      expect(game.title).toBe('Test Game');
      expect(game.thumbnail).toBe('http://example.com/thumb.jpg');
      expect(game.image).toBe('http://example.com/image.jpg');
      expect(game.minPlayers).toBe(2);
      expect(game.maxPlayers).toBe(4);
      expect(game.minPlayTime).toBe(30);
      expect(game.maxPlayTime).toBe(60);
      expect(game.yearPublished).toBe(2020);
      expect(game.description).toBe('A test game');
      expect(game.minAge).toBe(12);
      expect(game.complexity).toBe(2.5);
      expect(game.bggRating).toBe(7.5);
      expect(game.bggRatingsCount).toBe(1000);
      expect(game.bggRank).toBe(500);

      // Verify JSON fields are parsed to arrays
      expect(Array.isArray(game.mechanics)).toBe(true);
      expect(game.mechanics).toEqual(['Card Drafting', 'Hand Management']);
      expect(Array.isArray(game.categories)).toBe(true);
      expect(game.categories).toEqual(['Strategy', 'Card Game']);
      expect(Array.isArray(game.designers)).toBe(true);
      expect(game.designers).toEqual(['John Doe']);
      expect(Array.isArray(game.publishers)).toBe(true);
      expect(game.publishers).toEqual(['Test Publisher']);
      expect(Array.isArray(game.artists)).toBe(true);
      expect(game.artists).toEqual(['Jane Artist']);
    });

    it('should handle empty collection', async () => {
      mockGameFindMany.mockResolvedValueOnce([]);

      const response = await backupCollection(new Request('http://localhost:3000/api/backup/collection'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.gameCount).toBe(0);
      expect(data.games).toEqual([]);
    });

    it('should handle games with null/undefined JSON fields', async () => {
      const mockGames = [
        {
          bggId: 12345,
          title: 'Test Game',
          thumbnail: null,
          image: null,
          minPlayers: 2,
          maxPlayers: 4,
          minPlayTime: null,
          maxPlayTime: null,
          yearPublished: null,
          description: null,
          mechanics: null,
          categories: null,
          designers: null,
          publishers: null,
          artists: null,
          minAge: null,
          complexity: null,
          bggRating: null,
          bggRatingsCount: null,
          bggRank: null,
        },
      ];

      mockGameFindMany.mockResolvedValueOnce(mockGames);

      const response = await backupCollection(new Request('http://localhost:3000/api/backup/collection'));
      const data = await response.json();

      expect(response.status).toBe(200);
      const game = data.games[0];
      expect(game.mechanics).toEqual([]);
      expect(game.categories).toEqual([]);
      expect(game.designers).toEqual([]);
      expect(game.publishers).toEqual([]);
      expect(game.artists).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockGameFindMany.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await backupCollection(new Request('http://localhost:3000/api/backup/collection'));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to backup collection');
    });
  });

  describe('Backup Plays - GET /api/backup/plays', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValueOnce(null);

      const response = await backupPlays(new Request('http://localhost:3000/api/backup/plays'));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should backup plays with all related data', async () => {
      const mockPlays = [
        {
          id: 'play-1',
          game: {
            id: 'game-1',
            title: 'Test Game',
            bggId: 12345,
          },
          playedAt: new Date('2024-01-15T10:00:00Z'),
          players: [
            { id: 'player-1', name: 'Alice' },
            { id: 'player-2', name: 'Bob' },
          ],
          winners: [
            { id: 'player-1', name: 'Alice' },
          ],
          duration: 45,
          location: 'Home',
          rating: 8,
          notes: 'Great game!',
        },
      ];

      mockPlayLogFindMany.mockResolvedValueOnce(mockPlays);

      const response = await backupPlays(new Request('http://localhost:3000/api/backup/plays'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.exportType).toBe('plays');
      expect(data.playCount).toBe(1);
      expect(data.plays).toHaveLength(1);

      const play = data.plays[0];
      expect(play.id).toBe('play-1');
      expect(play.game.id).toBe('game-1');
      expect(play.game.title).toBe('Test Game');
      expect(play.game.bggId).toBe(12345);
      expect(play.playedAt).toBe('2024-01-15T10:00:00.000Z');
      expect(play.players).toHaveLength(2);
      expect(play.winners).toHaveLength(1);
      expect(play.duration).toBe(45);
      expect(play.location).toBe('Home');
      expect(play.rating).toBe(8);
      expect(play.notes).toBe('Great game!');
    });

    it('should handle empty plays log', async () => {
      mockPlayLogFindMany.mockResolvedValueOnce([]);

      const response = await backupPlays(new Request('http://localhost:3000/api/backup/plays'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.playCount).toBe(0);
      expect(data.plays).toEqual([]);
    });

    it('should handle plays with minimal data', async () => {
      const mockPlays = [
        {
          id: 'play-1',
          game: {
            id: 'game-1',
            title: 'Test Game',
            bggId: 12345,
          },
          playedAt: new Date('2024-01-15T10:00:00Z'),
          players: [],
          winners: [],
          duration: null,
          location: null,
          rating: null,
          notes: null,
        },
      ];

      mockPlayLogFindMany.mockResolvedValueOnce(mockPlays);

      const response = await backupPlays(new Request('http://localhost:3000/api/backup/plays'));
      const data = await response.json();

      expect(response.status).toBe(200);
      const play = data.plays[0];
      expect(play.players).toEqual([]);
      expect(play.winners).toEqual([]);
      expect(play.duration).toBeNull();
      expect(play.location).toBeNull();
      expect(play.rating).toBeNull();
      expect(play.notes).toBeNull();
    });
  });

  describe('Restore Collection - POST /api/restore/collection', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/restore/collection', {
        method: 'POST',
        body: JSON.stringify({ games: [], conflictResolution: 'skip' }),
      });

      const response = await restoreCollection(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should analyze conflicts without importing when conflictResolution is undefined', async () => {
      const existingGames = [
        { bggId: 12345, title: 'Existing Game' },
      ];

      mockGameFindMany.mockResolvedValueOnce(existingGames);

      const backupGames = [
        { bggId: 12345, title: 'Existing Game' }, // Conflict
        { bggId: 67890, title: 'New Game' }, // New
      ];

      const request = new Request('http://localhost:3000/api/restore/collection', {
        method: 'POST',
        body: JSON.stringify({ games: backupGames }),
      });

      const response = await restoreCollection(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalGames).toBe(2);
      expect(data.newGames).toBe(1);
      expect(data.conflicts).toBe(1);
      expect(data.conflictGames).toHaveLength(1);
      expect(data.conflictGames[0].title).toBe('Existing Game');
      expect(mockGameCreate).not.toHaveBeenCalled();
    });

    it('should import new games with skip strategy', async () => {
      mockGameFindMany.mockResolvedValueOnce([]);
      mockGameCreate.mockResolvedValueOnce({ id: 'new-game-1' });

      const backupGames = [
        {
          bggId: 12345,
          title: 'Test Game',
          thumbnail: 'http://example.com/thumb.jpg',
          image: 'http://example.com/image.jpg',
          minPlayers: 2,
          maxPlayers: 4,
          minPlayTime: 30,
          maxPlayTime: 60,
          yearPublished: 2020,
          description: 'A test game',
          mechanics: ['Card Drafting', 'Hand Management'],
          categories: ['Strategy', 'Card Game'],
          designers: ['John Doe'],
          publishers: ['Test Publisher'],
          artists: ['Jane Artist'],
          minAge: 12,
          complexity: 2.5,
          bggRating: 7.5,
          bggRatingsCount: 1000,
          bggRank: 500,
        },
      ];

      const request = new Request('http://localhost:3000/api/restore/collection', {
        method: 'POST',
        body: JSON.stringify({ games: backupGames, conflictResolution: 'skip' }),
      });

      const response = await restoreCollection(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.imported).toBe(1);
      expect(data.skipped).toBe(0);
      expect(data.replaced).toBe(0);
      expect(data.errors).toEqual([]);

      expect(mockGameCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bggId: 12345,
          title: 'Test Game',
          thumbnail: 'http://example.com/thumb.jpg',
          image: 'http://example.com/image.jpg',
          minPlayers: 2,
          maxPlayers: 4,
          minPlayTime: 30,
          maxPlayTime: 60,
          yearPublished: 2020,
          description: 'A test game',
          mechanics: JSON.stringify(['Card Drafting', 'Hand Management']),
          categories: JSON.stringify(['Strategy', 'Card Game']),
          designers: JSON.stringify(['John Doe']),
          publishers: JSON.stringify(['Test Publisher']),
          artists: JSON.stringify(['Jane Artist']),
          minAge: 12,
          complexity: 2.5,
          bggRating: 7.5,
          bggRatingsCount: 1000,
          bggRank: 500,
          userId: 'user-1',
        }),
      });
    });

    it('should skip duplicates with skip strategy', async () => {
      const existingGames = [
        { bggId: 12345, title: 'Existing Game' },
      ];

      mockGameFindMany.mockResolvedValueOnce(existingGames);

      const backupGames = [
        {
          bggId: 12345,
          title: 'Existing Game',
          minPlayers: 2,
          maxPlayers: 4,
          mechanics: [],
          categories: [],
          designers: [],
          publishers: [],
          artists: [],
        },
      ];

      const request = new Request('http://localhost:3000/api/restore/collection', {
        method: 'POST',
        body: JSON.stringify({ games: backupGames, conflictResolution: 'skip' }),
      });

      const response = await restoreCollection(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.imported).toBe(0);
      expect(data.skipped).toBe(1);
      expect(data.replaced).toBe(0);
      expect(mockGameCreate).not.toHaveBeenCalled();
    });

    it('should replace duplicates with replace strategy', async () => {
      const existingGames = [
        { bggId: 12345, title: 'Old Game' },
      ];

      mockGameFindMany.mockResolvedValueOnce(existingGames);
      mockGameDeleteMany.mockResolvedValueOnce({ count: 1 });
      mockGameCreate.mockResolvedValueOnce({ id: 'new-game-1' });

      const backupGames = [
        {
          bggId: 12345,
          title: 'New Game',
          minPlayers: 2,
          maxPlayers: 4,
          mechanics: [],
          categories: [],
          designers: [],
          publishers: [],
          artists: [],
        },
      ];

      const request = new Request('http://localhost:3000/api/restore/collection', {
        method: 'POST',
        body: JSON.stringify({ games: backupGames, conflictResolution: 'replace' }),
      });

      const response = await restoreCollection(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.imported).toBe(1);
      expect(data.skipped).toBe(0);
      expect(data.replaced).toBe(1);

      expect(mockGameDeleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          OR: [
            { bggId: 12345 },
            { title: 'New Game' },
          ],
        },
      });
      expect(mockGameCreate).toHaveBeenCalled();
    });

    it('should handle keepBoth strategy', async () => {
      const existingGames = [
        { bggId: 12345, title: 'Existing Game' },
      ];

      mockGameFindMany.mockResolvedValueOnce(existingGames);
      mockGameCreate.mockResolvedValueOnce({ id: 'new-game-1' });

      const backupGames = [
        {
          bggId: 12345,
          title: 'Existing Game',
          minPlayers: 2,
          maxPlayers: 4,
          mechanics: [],
          categories: [],
          designers: [],
          publishers: [],
          artists: [],
        },
      ];

      const request = new Request('http://localhost:3000/api/restore/collection', {
        method: 'POST',
        body: JSON.stringify({ games: backupGames, conflictResolution: 'keepBoth' }),
      });

      const response = await restoreCollection(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.imported).toBe(1);
      expect(mockGameDeleteMany).not.toHaveBeenCalled();
      expect(mockGameCreate).toHaveBeenCalled();
    });

    it('should handle invalid backup data', async () => {
      const request = new Request('http://localhost:3000/api/restore/collection', {
        method: 'POST',
        body: JSON.stringify({ games: 'not an array' }),
      });

      const response = await restoreCollection(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid backup data');
    });

    it('should handle empty games array', async () => {
      mockGameFindMany.mockResolvedValueOnce([]);

      const request = new Request('http://localhost:3000/api/restore/collection', {
        method: 'POST',
        body: JSON.stringify({ games: [], conflictResolution: 'skip' }),
      });

      const response = await restoreCollection(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.imported).toBe(0);
      expect(data.skipped).toBe(0);
    });

    it('should handle individual game import errors gracefully', async () => {
      mockGameFindMany.mockResolvedValueOnce([]);
      mockGameCreate
        .mockResolvedValueOnce({ id: 'game-1' })
        .mockRejectedValueOnce(new Error('Database error'));

      const backupGames = [
        {
          bggId: 12345,
          title: 'Game 1',
          minPlayers: 2,
          maxPlayers: 4,
          mechanics: [],
          categories: [],
          designers: [],
          publishers: [],
          artists: [],
        },
        {
          bggId: 67890,
          title: 'Game 2',
          minPlayers: 2,
          maxPlayers: 4,
          mechanics: [],
          categories: [],
          designers: [],
          publishers: [],
          artists: [],
        },
      ];

      const request = new Request('http://localhost:3000/api/restore/collection', {
        method: 'POST',
        body: JSON.stringify({ games: backupGames, conflictResolution: 'skip' }),
      });

      const response = await restoreCollection(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.imported).toBe(1);
      expect(data.errors).toContain('Game 2');
    });

    it('should handle legacy backup without new schema fields', async () => {
      mockGameFindMany.mockResolvedValueOnce([]);
      mockGameCreate.mockResolvedValueOnce({ id: 'new-game-1' });

      // Legacy backup without artists and other new fields
      const legacyBackupGames = [
        {
          bggId: 12345,
          title: 'Test Game',
          thumbnail: 'http://example.com/thumb.jpg',
          image: 'http://example.com/image.jpg',
          minPlayers: 2,
          maxPlayers: 4,
          minPlayTime: 30,
          maxPlayTime: 60,
          yearPublished: 2020,
          description: 'A test game',
          mechanics: ['Card Drafting'],
          categories: ['Strategy'],
          designers: ['John Doe'],
          publishers: ['Test Publisher'],
          // Missing: artists, minAge, complexity, bggRating, bggRatingsCount, bggRank
        },
      ];

      const request = new Request('http://localhost:3000/api/restore/collection', {
        method: 'POST',
        body: JSON.stringify({ games: legacyBackupGames, conflictResolution: 'skip' }),
      });

      const response = await restoreCollection(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.imported).toBe(1);

      // Verify that missing fields are handled (stored as undefined/null)
      expect(mockGameCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          artists: JSON.stringify([]),
          minAge: undefined,
          complexity: undefined,
          bggRating: undefined,
          bggRatingsCount: undefined,
          bggRank: undefined,
        }),
      });
    });
  });

  describe('Restore Plays - POST /api/restore/plays', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/restore/plays', {
        method: 'POST',
        body: JSON.stringify({ plays: [] }),
      });

      const response = await restorePlays(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should restore plays successfully', async () => {
      const userGames = [
        { id: 'game-1', title: 'Test Game', bggId: 12345 },
      ];
      const userPlayers = [
        { id: 'player-1', name: 'Alice' },
      ];

      mockGameFindMany.mockResolvedValueOnce(userGames);
      mockPlayerFindMany.mockResolvedValueOnce(userPlayers);
      mockPlayLogFindFirst.mockResolvedValueOnce(null); // No existing play
      mockPlayLogCreate.mockResolvedValueOnce({ id: 'new-play-1' });

      const backupPlays = [
        {
          id: 'play-1',
          game: {
            id: 'old-game-id',
            title: 'Test Game',
            bggId: 12345,
          },
          playedAt: '2024-01-15T10:00:00Z',
          players: [
            { id: 'old-player-id', name: 'Alice' },
          ],
          winners: [
            { id: 'old-player-id', name: 'Alice' },
          ],
          duration: 45,
          location: 'Home',
          rating: 8,
          notes: 'Great game!',
        },
      ];

      const request = new Request('http://localhost:3000/api/restore/plays', {
        method: 'POST',
        body: JSON.stringify({ plays: backupPlays }),
      });

      const response = await restorePlays(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.imported).toBe(1);
      expect(data.skipped).toBe(0);
      expect(data.gameNotFound).toBe(0);

      expect(mockPlayLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          gameId: 'game-1',
          userId: 'user-1',
          playedAt: new Date('2024-01-15T10:00:00Z'),
          duration: 45,
          location: 'Home',
          rating: 8,
          notes: 'Great game!',
        }),
      });
    });

    it('should skip existing plays', async () => {
      const userGames = [
        { id: 'game-1', title: 'Test Game', bggId: 12345 },
      ];
      const userPlayers = [];

      mockGameFindMany.mockResolvedValueOnce(userGames);
      mockPlayerFindMany.mockResolvedValueOnce(userPlayers);
      mockPlayLogFindFirst.mockResolvedValueOnce({ id: 'existing-play' });

      const backupPlays = [
        {
          id: 'play-1',
          game: {
            id: 'old-game-id',
            title: 'Test Game',
            bggId: 12345,
          },
          playedAt: '2024-01-15T10:00:00Z',
          players: [],
          winners: [],
        },
      ];

      const request = new Request('http://localhost:3000/api/restore/plays', {
        method: 'POST',
        body: JSON.stringify({ plays: backupPlays }),
      });

      const response = await restorePlays(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.imported).toBe(0);
      expect(data.skipped).toBe(1);
      expect(mockPlayLogCreate).not.toHaveBeenCalled();
    });

    it('should skip plays for non-existent games', async () => {
      const userGames = []; // No games
      const userPlayers = [];

      mockGameFindMany.mockResolvedValueOnce(userGames);
      mockPlayerFindMany.mockResolvedValueOnce(userPlayers);

      const backupPlays = [
        {
          id: 'play-1',
          game: {
            id: 'old-game-id',
            title: 'Unknown Game',
            bggId: 99999,
          },
          playedAt: '2024-01-15T10:00:00Z',
          players: [],
          winners: [],
        },
      ];

      const request = new Request('http://localhost:3000/api/restore/plays', {
        method: 'POST',
        body: JSON.stringify({ plays: backupPlays }),
      });

      const response = await restorePlays(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.imported).toBe(0);
      expect(data.gameNotFound).toBe(1);
      expect(mockPlayLogCreate).not.toHaveBeenCalled();
    });

    it('should create new players if not found', async () => {
      const userGames = [
        { id: 'game-1', title: 'Test Game', bggId: 12345 },
      ];
      const userPlayers = []; // No existing players

      mockGameFindMany.mockResolvedValueOnce(userGames);
      mockPlayerFindMany.mockResolvedValueOnce(userPlayers);
      mockPlayLogFindFirst.mockResolvedValueOnce(null);
      mockPlayerCreate.mockResolvedValueOnce({ id: 'new-player-1', name: 'Bob' });
      mockPlayLogCreate.mockResolvedValueOnce({ id: 'new-play-1' });

      const backupPlays = [
        {
          id: 'play-1',
          game: {
            id: 'old-game-id',
            title: 'Test Game',
            bggId: 12345,
          },
          playedAt: '2024-01-15T10:00:00Z',
          players: [
            { id: 'old-id', name: 'Bob' },
          ],
          winners: [],
        },
      ];

      const request = new Request('http://localhost:3000/api/restore/plays', {
        method: 'POST',
        body: JSON.stringify({ plays: backupPlays }),
      });

      const response = await restorePlays(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.imported).toBe(1);
      expect(mockPlayerCreate).toHaveBeenCalledWith({
        data: {
          name: 'Bob',
          userId: 'user-1',
        },
      });
    });

    it('should match games by title if bggId does not match', async () => {
      const userGames = [
        { id: 'game-1', title: 'Test Game', bggId: 99999 }, // Different bggId
      ];
      const userPlayers = [];

      mockGameFindMany.mockResolvedValueOnce(userGames);
      mockPlayerFindMany.mockResolvedValueOnce(userPlayers);
      mockPlayLogFindFirst.mockResolvedValueOnce(null);
      mockPlayLogCreate.mockResolvedValueOnce({ id: 'new-play-1' });

      const backupPlays = [
        {
          id: 'play-1',
          game: {
            id: 'old-game-id',
            title: 'Test Game', // Same title
            bggId: 12345, // Different bggId
          },
          playedAt: '2024-01-15T10:00:00Z',
          players: [],
          winners: [],
        },
      ];

      const request = new Request('http://localhost:3000/api/restore/plays', {
        method: 'POST',
        body: JSON.stringify({ plays: backupPlays }),
      });

      const response = await restorePlays(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.imported).toBe(1);
      expect(mockPlayLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          gameId: 'game-1',
        }),
      });
    });

    it('should handle empty plays array', async () => {
      mockGameFindMany.mockResolvedValueOnce([]);
      mockPlayerFindMany.mockResolvedValueOnce([]);

      const request = new Request('http://localhost:3000/api/restore/plays', {
        method: 'POST',
        body: JSON.stringify({ plays: [] }),
      });

      const response = await restorePlays(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.imported).toBe(0);
      expect(data.skipped).toBe(0);
    });

    it('should handle invalid backup data', async () => {
      const request = new Request('http://localhost:3000/api/restore/plays', {
        method: 'POST',
        body: JSON.stringify({ plays: 'not an array' }),
      });

      const response = await restorePlays(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid backup data');
    });

    it('should handle individual play import errors gracefully', async () => {
      const userGames = [
        { id: 'game-1', title: 'Test Game', bggId: 12345 },
      ];
      const userPlayers = [];

      mockGameFindMany.mockResolvedValueOnce(userGames);
      mockPlayerFindMany.mockResolvedValueOnce(userPlayers);
      mockPlayLogFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPlayLogCreate
        .mockResolvedValueOnce({ id: 'play-1' })
        .mockRejectedValueOnce(new Error('Database error'));

      const backupPlays = [
        {
          id: 'play-1',
          game: { id: 'g1', title: 'Test Game', bggId: 12345 },
          playedAt: '2024-01-15T10:00:00Z',
          players: [],
          winners: [],
        },
        {
          id: 'play-2',
          game: { id: 'g1', title: 'Test Game', bggId: 12345 },
          playedAt: '2024-01-16T10:00:00Z',
          players: [],
          winners: [],
        },
      ];

      const request = new Request('http://localhost:3000/api/restore/plays', {
        method: 'POST',
        body: JSON.stringify({ plays: backupPlays }),
      });

      const response = await restorePlays(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.imported).toBe(1);
      expect(data.errors).toContain('Test Game');
    });
  });

  describe('Integration: Full Backup and Restore Workflow', () => {
    it('should backup and restore collection preserving all data', async () => {
      // Step 1: Setup original games
      const originalGames = [
        {
          bggId: 12345,
          title: 'Catan',
          thumbnail: 'http://example.com/catan.jpg',
          image: 'http://example.com/catan-large.jpg',
          minPlayers: 3,
          maxPlayers: 4,
          minPlayTime: 60,
          maxPlayTime: 120,
          yearPublished: 1995,
          description: 'A strategy game about trading and building',
          mechanics: JSON.stringify(['Trading', 'Dice Rolling']),
          categories: JSON.stringify(['Strategy', 'Family']),
          designers: JSON.stringify(['Klaus Teuber']),
          publishers: JSON.stringify(['Kosmos']),
          artists: JSON.stringify(['Tanja Donner']),
          minAge: 10,
          complexity: 2.3,
          bggRating: 7.1,
          bggRatingsCount: 150000,
          bggRank: 300,
        },
      ];

      mockGameFindMany.mockResolvedValueOnce(originalGames);

      // Step 2: Backup
      const backupResponse = await backupCollection(new Request('http://localhost:3000/api/backup/collection'));
      const backupData = await backupResponse.json();

      expect(backupResponse.status).toBe(200);
      expect(backupData.games).toHaveLength(1);

      // Step 3: Clear mocks and setup for restore
      jest.clearAllMocks();
      mockGameFindMany.mockResolvedValueOnce([]); // Empty collection
      mockGameCreate.mockResolvedValueOnce({ id: 'restored-game-1' });

      // Step 4: Restore
      const restoreRequest = new Request('http://localhost:3000/api/restore/collection', {
        method: 'POST',
        body: JSON.stringify({
          games: backupData.games,
          conflictResolution: 'skip',
        }),
      });

      const restoreResponse = await restoreCollection(restoreRequest);
      const restoreData = await restoreResponse.json();

      expect(restoreResponse.status).toBe(200);
      expect(restoreData.imported).toBe(1);

      // Step 5: Verify all fields were restored correctly
      const createCall = mockGameCreate.mock.calls[0][0];
      expect(createCall.data.bggId).toBe(12345);
      expect(createCall.data.title).toBe('Catan');
      expect(createCall.data.mechanics).toBe(JSON.stringify(['Trading', 'Dice Rolling']));
      expect(createCall.data.categories).toBe(JSON.stringify(['Strategy', 'Family']));
      expect(createCall.data.designers).toBe(JSON.stringify(['Klaus Teuber']));
      expect(createCall.data.publishers).toBe(JSON.stringify(['Kosmos']));
      expect(createCall.data.artists).toBe(JSON.stringify(['Tanja Donner']));
      expect(createCall.data.minAge).toBe(10);
      expect(createCall.data.complexity).toBe(2.3);
      expect(createCall.data.bggRating).toBe(7.1);
      expect(createCall.data.bggRatingsCount).toBe(150000);
      expect(createCall.data.bggRank).toBe(300);
    });

    it('should backup and restore plays preserving relationships', async () => {
      // Step 1: Setup original plays
      const originalPlays = [
        {
          id: 'play-1',
          game: {
            id: 'game-1',
            title: 'Catan',
            bggId: 12345,
          },
          playedAt: new Date('2024-03-15T19:00:00Z'),
          players: [
            { id: 'player-1', name: 'Alice' },
            { id: 'player-2', name: 'Bob' },
          ],
          winners: [
            { id: 'player-1', name: 'Alice' },
          ],
          duration: 90,
          location: 'Home',
          rating: 9,
          notes: 'Great session!',
        },
      ];

      mockPlayLogFindMany.mockResolvedValueOnce(originalPlays);

      // Step 2: Backup
      const backupResponse = await backupPlays(new Request('http://localhost:3000/api/backup/plays'));
      const backupData = await backupResponse.json();

      expect(backupResponse.status).toBe(200);
      expect(backupData.plays).toHaveLength(1);

      // Step 3: Setup for restore
      jest.clearAllMocks();
      mockGameFindMany.mockResolvedValueOnce([{ id: 'game-1', title: 'Catan', bggId: 12345 }]);
      mockPlayerFindMany.mockResolvedValueOnce([
        { id: 'player-1', name: 'Alice' },
        { id: 'player-2', name: 'Bob' },
      ]);
      mockPlayLogFindFirst.mockResolvedValueOnce(null);
      mockPlayLogCreate.mockResolvedValueOnce({ id: 'restored-play-1' });

      // Step 4: Restore
      const restoreRequest = new Request('http://localhost:3000/api/restore/plays', {
        method: 'POST',
        body: JSON.stringify({ plays: backupData.plays }),
      });

      const restoreResponse = await restorePlays(restoreRequest);
      const restoreData = await restoreResponse.json();

      expect(restoreResponse.status).toBe(200);
      expect(restoreData.imported).toBe(1);

      // Step 5: Verify relationships
      const createCall = mockPlayLogCreate.mock.calls[0][0];
      expect(createCall.data.gameId).toBe('game-1');
      expect(createCall.data.players.connect).toEqual([
        { id: 'player-1' },
        { id: 'player-2' },
      ]);
      expect(createCall.data.winners.connect).toEqual([
        { id: 'player-1' },
      ]);
    });
  });
});

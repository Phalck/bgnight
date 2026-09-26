import { Prisma } from '@prisma/client';
import { POST as manualAdd } from '@/app/api/games/manual/route';

const mockGetServerSession = jest.fn();
jest.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

const mockGameFindUnique = jest.fn();
const mockGameCreate = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    game: {
      findUnique: (...args: unknown[]) => mockGameFindUnique(...args),
      create: (...args: unknown[]) => mockGameCreate(...args),
    },
  },
}));

const post = (body: Record<string, unknown>) =>
  manualAdd(new Request('http://localhost:3000/api/games/manual', {
    method: 'POST',
    body: JSON.stringify(body),
  }));

const bggIdCollision = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target: ['bggId'] },
  });

const created = (data: { bggId: number }) => Promise.resolve({
  id: 'game-1',
  mechanics: '[]',
  categories: '[]',
  designers: '[]',
  publishers: '[]',
  ...data,
});

describe('Manual add - POST /api/games/manual', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockGameFindUnique.mockResolvedValue(null);
    mockGameCreate.mockImplementation(({ data }) => created(data));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const response = await post({ title: 'Anything' });
    expect(response.status).toBe(401);
  });

  it('requires a title', async () => {
    const response = await post({ title: '' });
    expect(response.status).toBe(400);
  });

  it('stores the real BGG id when the game was imported from BGG', async () => {
    const response = await post({ title: 'Baltic Empires: The Northern Wars of 1558-1721', bggId: 349944 });

    expect(response.status).toBe(200);
    expect(mockGameCreate.mock.calls[0][0].data.bggId).toBe(349944);
    expect(mockGameCreate.mock.calls[0][0].data.title).toBe('Baltic Empires: The Northern Wars of 1558-1721');
  });

  it('rejects a game that is already in the same user\'s collection', async () => {
    mockGameFindUnique.mockResolvedValueOnce({ userId: 'user-1' });

    const response = await post({ title: 'Baltic Empires', bggId: 349944 });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/already in your collection/);
    expect(mockGameCreate).not.toHaveBeenCalled();
  });

  it('adds the game unlinked, without touching the other user\'s row, when another account owns the BGG id', async () => {
    mockGameFindUnique.mockResolvedValueOnce({ userId: 'user-2' });

    const response = await post({ title: 'Baltic Empires', bggId: 349944 });

    expect(response.status).toBe(200);
    expect(mockGameCreate).toHaveBeenCalledTimes(1);
    expect(mockGameCreate.mock.calls[0][0].data.bggId).toBeLessThan(0);
    expect(mockGameCreate.mock.calls[0][0].data.userId).toBe('user-1');
  });

  it.each([0, -5, 1.5, 'abc'])('rejects an invalid BGG id (%s)', async (bggId) => {
    const response = await post({ title: 'Baltic Empires', bggId });
    expect(response.status).toBe(400);
    expect(mockGameCreate).not.toHaveBeenCalled();
  });

  it('gives games without a BGG id a negative id that cannot collide with real BGG ids', async () => {
    const response = await post({ title: 'My Homebrew Game' });

    expect(response.status).toBe(200);
    expect(mockGameFindUnique).not.toHaveBeenCalled();
    expect(mockGameCreate.mock.calls[0][0].data.bggId).toBeLessThan(0);
  });

  it('retries with a new id when the generated id collides', async () => {
    mockGameCreate
      .mockRejectedValueOnce(bggIdCollision())
      .mockRejectedValueOnce(bggIdCollision())
      .mockImplementation(({ data }) => created(data));

    const response = await post({ title: 'My Homebrew Game' });

    expect(response.status).toBe(200);
    expect(mockGameCreate).toHaveBeenCalledTimes(3);
  });

  it('gives up with a 500 after repeated collisions', async () => {
    mockGameCreate.mockRejectedValue(bggIdCollision());

    const response = await post({ title: 'My Homebrew Game' });

    expect(response.status).toBe(500);
    expect(mockGameCreate).toHaveBeenCalledTimes(5);
  });

  it('reports a race on a real BGG id as "already in a collection", not a server error', async () => {
    mockGameCreate.mockRejectedValueOnce(bggIdCollision());

    const response = await post({ title: 'Baltic Empires', bggId: 349944 });

    expect(response.status).toBe(400);
    expect(mockGameCreate).toHaveBeenCalledTimes(1);
  });

  it('does not swallow unrelated database errors', async () => {
    mockGameCreate.mockRejectedValueOnce(new Error('connection lost'));

    const response = await post({ title: 'My Homebrew Game' });

    expect(response.status).toBe(500);
    expect(mockGameCreate).toHaveBeenCalledTimes(1);
  });
});

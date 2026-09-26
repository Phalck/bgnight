import { buildPlan, exactMatch, looseMatch, normalizeTitle, BggInfo, GameRow, ResolveResult, Resolver } from '@/lib/bgg-id-repair';

const game = (over: Partial<GameRow>): GameRow => ({
  id: 'g1', userId: 'u1', title: 'Some Game', bggId: 1234, yearPublished: 2020, ...over,
});

const run = async (games: GameRow[], info: BggInfo[], resolve: Resolver, includeUnlinked = false) => {
  let n = 0;
  return buildPlan({
    games,
    infoById: new Map(info.map(i => [i.id, i])),
    resolve,
    randomUnlinkedId: () => -(++n),
    includeUnlinked,
  });
};

describe('title matching', () => {
  it('normalizes case, punctuation, accents, entities and ampersands', () => {
    expect(normalizeTitle('Zoo &amp; Tycoon: Café!')).toBe('zoo and tycoon cafe');
    expect(normalizeTitle('Zoo & Tycoon: Cafe')).toBe('zoo and tycoon cafe');
  });

  it('exactMatch requires the whole title to match a BGG name', () => {
    expect(exactMatch('catan', ['CATAN', 'Die Siedler von Catan'])).toBe(true);
    expect(exactMatch('Baltic Empires', ['Baltic Empires: The Northern Wars of 1558-1721'])).toBe(false);
  });

  it('looseMatch also accepts a differing subtitle', () => {
    expect(looseMatch('Baltic Empires', ['Baltic Empires: The Northern Wars of 1558-1721'])).toBe(true);
    expect(looseMatch('Baltic Empires: Northern Wars', ['Baltic Empires: The Northern Wars of 1558-1721'])).toBe(true);
    expect(looseMatch('Catan', ['Carcassonne'])).toBe(false);
  });
});

describe('buildPlan', () => {
  const never: Resolver = async () => { throw new Error('should not search'); };

  it('leaves a genuine BGG id alone without searching', async () => {
    const { plan, kept } = await run([game({ title: 'Catan', bggId: 13 })], [{ id: 13, names: ['CATAN'] }], never);
    expect(plan).toEqual([]);
    expect(kept).toBe(1);
  });

  it('leaves already-unlinked games alone', async () => {
    const { plan } = await run([game({ bggId: -5 })], [], never);
    expect(plan).toEqual([]);
  });

  it('links a wrong random id to the real BGG id when there is one exact match', async () => {
    const resolve: Resolver = async () => ({ status: 'match', id: 349944, name: 'Baltic Empires' });
    const { plan } = await run([game({ title: 'Baltic Empires', bggId: 777 })], [{ id: 777, names: ['Wrong Game'] }], resolve);

    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({ kind: 'linked', oldBggId: 777, newBggId: 349944, oldBggName: 'Wrong Game' });
  });

  it('makes the game unlinked (negative id) when the random id does not exist on BGG and nothing matches', async () => {
    const { plan } = await run([game({ title: 'My Homebrew', bggId: 999999 })], [], async () => ({ status: 'none' }));

    expect(plan[0]).toMatchObject({ kind: 'unlinked', oldBggName: null });
    expect(plan[0].newBggId).toBeLessThan(0);
  });

  it('makes the game unlinked when several BGG games match', async () => {
    const { plan } = await run([game({ bggId: 5 })], [], async () => ({ status: 'ambiguous', ids: [1, 2] }));
    expect(plan[0].kind).toBe('unlinked');
    expect(plan[0].reason).toMatch(/several/);
  });

  const baltic: Resolver = async () => ({ status: 'match', id: 349944, name: 'Baltic Empires' });

  it('links the real id even when a different user already owns that BGG game', async () => {
    const { plan } = await run(
      [game({ id: 'a', userId: 'u1', bggId: 349944, title: 'Baltic Empires' }), game({ id: 'b', userId: 'u2', bggId: 777, title: 'Baltic Empires' })],
      [{ id: 349944, names: ['Baltic Empires'] }],
      baltic);

    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({ gameId: 'b', kind: 'linked', newBggId: 349944 });
  });

  it('does not reuse a real id the same user already holds on another row', async () => {
    const { plan } = await run(
      [game({ id: 'a', bggId: 349944, title: 'Baltic Empires' }), game({ id: 'b', bggId: 777, title: 'Baltic Empires' })],
      [{ id: 349944, names: ['Baltic Empires'] }],
      baltic);

    expect(plan[0]).toMatchObject({ gameId: 'b', kind: 'unlinked' });
    expect(plan[0].reason).toMatch(/already in this user's collection/);
  });

  it('never assigns the same new id to two of one user\'s games', async () => {
    const { plan } = await run([game({ id: 'a', bggId: 700 }), game({ id: 'b', bggId: 701 })], [], baltic);

    expect(plan.map(p => p.kind).sort()).toEqual(['linked', 'unlinked']);
    expect(new Set(plan.map(p => p.newBggId)).size).toBe(2);
  });

  it('skips negative ids the same user already has', async () => {
    const { plan } = await run(
      [game({ id: 'a', bggId: 5 }), game({ id: 'b', bggId: -1 }), game({ id: 'c', bggId: -2 })],
      [], async () => ({ status: 'none' }));

    expect(plan).toHaveLength(1);
    expect(plan[0].newBggId).toBe(-3);
  });

  describe('includeUnlinked', () => {
    it('ignores unlinked games by default', async () => {
      const { plan } = await run([game({ bggId: -9 })], [], baltic);
      expect(plan).toEqual([]);
    });

    it('links an unlinked game when there is an exact BGG match', async () => {
      const { plan } = await run([game({ bggId: -9, title: 'Baltic Empires' })], [], baltic, true);

      expect(plan).toHaveLength(1);
      expect(plan[0]).toMatchObject({ kind: 'linked', oldBggId: -9, newBggId: 349944, reason: expect.stringMatching(/currently unlinked/) });
    });

    it.each<[string, ResolveResult]>([
      ['no match', { status: 'none' }],
      ['several matches', { status: 'ambiguous', ids: [1, 2] }],
    ])('leaves an unlinked game exactly as it is on %s', async (_label, result) => {
      const { plan } = await run([game({ bggId: -9 })], [], async () => result, true);
      expect(plan).toEqual([]);
    });

    it('does not link to an id the same user already has', async () => {
      const { plan } = await run(
        [game({ id: 'a', bggId: 349944, title: 'Baltic Empires' }), game({ id: 'b', bggId: -9, title: 'Baltic Empires' })],
        [{ id: 349944, names: ['Baltic Empires'] }], baltic, true);
      expect(plan).toEqual([]);
    });
  });
});

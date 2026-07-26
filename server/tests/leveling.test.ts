import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ userUpdate: vi.fn() }));

vi.mock('../src/lib/prisma', () => ({ prisma: { user: { update: mocks.userUpdate } } }));

import { awardXp } from '../src/services/leveling';

/**
 * awardXp updates twice: first to increment XP (returning the fresh row), then to
 * persist the recalculated level. These helpers mirror that.
 */
const withXp = (xp: number, level: number) => {
    mocks.userUpdate.mockReset();
    mocks.userUpdate.mockResolvedValueOnce({ id: 'user-1', xp, level });
    mocks.userUpdate.mockResolvedValueOnce({ id: 'user-1' });
};

const persistedLevel = () => mocks.userUpdate.mock.calls[1][0].data.level;

beforeEach(() => vi.clearAllMocks());

describe('XP and levelling', () => {
    it('increments XP by the awarded amount', async () => {
        withXp(50, 1);

        await awardXp('user-1', 50);

        expect(mocks.userUpdate.mock.calls[0][0]).toMatchObject({
            where: { id: 'user-1' },
            data: { xp: { increment: 50 } },
        });
    });

    it('keeps level 1 below the first threshold', async () => {
        withXp(99, 1);
        const result = await awardXp('user-1', 99);

        expect(persistedLevel()).toBe(1);
        expect(result?.leveledUp).toBe(false);
    });

    it('levels up exactly at each threshold, not one XP early', async () => {
        // The table is 0/100/300/600/1000... — an off-by-one here would either hand
        // out levels early or strand people one point short.
        const cases: Array<[number, number]> = [[100, 2], [299, 2], [300, 3], [600, 4], [1000, 5], [4500, 10]];

        for (const [xp, expected] of cases) {
            withXp(xp, 1);
            await awardXp('user-1', 0);
            expect(persistedLevel(), `${xp} XP should be level ${expected}`).toBe(expected);
        }
    });

    it('caps at the top of the table instead of running past it', async () => {
        withXp(999_999, 1);
        await awardXp('user-1', 0);

        expect(persistedLevel()).toBe(10);
    });

    it('never demotes someone whose level is already higher', async () => {
        withXp(0, 7); // level was granted before; XP alone would say level 1
        await awardXp('user-1', 0);

        expect(persistedLevel()).toBe(7);
    });

    it('reports a level-up so callers can react to it', async () => {
        withXp(300, 2);
        const result = await awardXp('user-1', 200);

        expect(result).toMatchObject({ newLevel: 3, leveledUp: true });
    });

    it('no longer writes badges — those belong to the badge service', async () => {
        withXp(4500, 1);
        await awardXp('user-1', 0);

        expect(mocks.userUpdate.mock.calls[1][0].data).not.toHaveProperty('badges');
    });
});

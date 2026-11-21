import { describe, expect, it } from 'vitest';
import { esportsGameScope, isEsportsGameSlug } from '../src/services/esports/gameScope';

describe('esports overview game scope', () => {
    const catalog = [
        { id: 'game-1', name: 'Counter-Strike 2', slug: 'counter-strike-2' },
        { id: 'game-2', name: 'League of Legends', slug: 'league-of-legends' },
        { id: 'game-3', name: 'Valorant', slug: 'valorant' },
    ];

    it('matches linked games and legacy records without changing the public focus', () => {
        const scope = esportsGameScope('cs2', catalog);
        expect(scope.where.OR[0]).toEqual({ gameId: { in: ['game-1'] } });
        expect(scope.where.OR[1]).toMatchObject({ gameId: null, game: { in: expect.arrayContaining(['Counter-Strike 2', 'CS2', 'CS:GO']), mode: 'insensitive' } });
        expect(scope.matchesName('Counter-Strike 2')).toBe(true);
        expect(scope.matchesName('CS:GO')).toBe(true);
        expect(scope.matchesName('Valorant')).toBe(false);
        expect(esportsGameScope('counter-strike-2', catalog).where).toEqual(scope.where);
    });

    it('supports titles outside the main navigation and rejects invalid query values', () => {
        expect(esportsGameScope('pokemon-unite', catalog).matchesName('Pokémon UNITE')).toBe(true);
        expect(esportsGameScope('lol', catalog).hints).toContain('CBLOL');
        expect(isEsportsGameSlug('street-fighter-6')).toBe(true);
        for (const invalid of ['', 'cs2*', '../valorant', 'e'.repeat(101), ['cs2', 'lol']]) {
            expect(isEsportsGameSlug(invalid)).toBe(false);
        }
    });
});

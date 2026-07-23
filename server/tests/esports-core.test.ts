import { MatchStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { pickemPoints } from '../src/services/esports/derived';
import { isBrazilFocusedMatch } from '../src/services/esports/focus';
import type { ProviderMatch } from '../src/services/esports/provider';

const match = (overrides: Partial<ProviderMatch> = {}): ProviderMatch => ({
    externalId: 'valorant:1',
    gameWiki: 'valorant',
    tournament: { externalId: 'valorant:event', gameWiki: 'valorant', name: 'International League', slugSeed: 'event', sourceUrl: 'https://liquipedia.net/valorant/Event' },
    teamA: { externalId: 'a', name: 'Team A', country: 'us' },
    teamB: { externalId: 'b', name: 'Team B', country: 'cn' },
    scheduledAt: new Date('2026-08-01T12:00:00Z'),
    status: MatchStatus.SCHEDULED,
    scoreA: null,
    scoreB: null,
    bestOf: 3,
    sourceUrl: 'https://liquipedia.net/valorant/Match:1',
    ...overrides,
});

describe('Brazil esports focus', () => {
    it('accepts a Brazilian team by country', () => {
        expect(isBrazilFocusedMatch(match({ teamA: { externalId: 'a', name: 'Nova Equipe', country: 'br' } }))).toBe(true);
    });

    it('accepts configured Brazilian organizations even when country is missing', () => {
        expect(isBrazilFocusedMatch(match({ teamA: { externalId: 'loud', name: 'LOUD', country: 'xx' } }))).toBe(true);
    });

    it('rejects unrelated international matches', () => {
        expect(isBrazilFocusedMatch(match())).toBe(false);
    });
});

describe("Pick'em scoring", () => {
    it('awards ten points only for the winning team', () => {
        expect(pickemPoints('team-a', 'team-a')).toBe(10);
        expect(pickemPoints('team-b', 'team-a')).toBe(0);
        expect(pickemPoints('team-a', null)).toBe(0);
    });
});

import { MatchStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { pickemPoints } from '../src/services/esports/derived';
import { isBrazilFocusedMatch } from '../src/services/esports/focus';
import { mapLiquipediaMatch } from '../src/services/esports/liquipedia';
import { currentLiveMatchWhere, toPublicMatch, type PublicMatchRecord } from '../src/services/esports/dto';
import { ESPORTS_SYNC_INTERVAL_MINUTES } from '../src/utils/config';
import type { ProviderMatch } from '../src/services/esports/provider';

const match = (overrides: Partial<ProviderMatch> = {}): ProviderMatch => ({
    externalId: 'valorant:1',
    gameWiki: 'valorant',
    gameAliases: ['valorant'],
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

describe('Liquipedia scoreboard', () => {
    const row = () => ({
        match2id: 'example',
        parent: 'Example_Tournament',
        date: new Date(Date.now() - 60_000).toISOString(),
        match2opponents: [{ name: 'Team A', score: null }, { name: 'Team B', score: '' }],
    });

    it('does not infer a live match or a zero score from missing provider fields', () => {
        expect(mapLiquipediaMatch('valorant', row())).toMatchObject({
            status: MatchStatus.SCHEDULED, scoreA: null, scoreB: null,
        });
    });

    it('preserves explicit live, terminal status and numeric zero scores', () => {
        expect(mapLiquipediaMatch('valorant', { ...row(), status: 'ongoing' })?.status).toBe(MatchStatus.LIVE);
        expect(mapLiquipediaMatch('valorant', {
            ...row(), status: 'live', finished: 1,
            match2opponents: [{ name: 'Team A', score: '0' }, { name: 'Team B', score: 2 }],
        })).toMatchObject({ status: MatchStatus.FINISHED, scoreA: 0, scoreB: 2 });
    });
});

describe('public live status', () => {
    const now = new Date('2026-11-05T19:00:00Z');
    const cutoff = new Date(now.getTime() - ESPORTS_SYNC_INTERVAL_MINUTES * 2 * 60_000);
    const publicMatch = (overrides: Partial<PublicMatchRecord>) => toPublicMatch({
        status: MatchStatus.LIVE,
        provider: 'LIQUIPEDIA',
        lastSyncedAt: now,
        ...overrides,
    } as PublicMatchRecord, now);

    it('uses the same cutoff for public lists and the match detail', () => {
        expect(currentLiveMatchWhere(now)).toEqual({
            status: MatchStatus.LIVE,
            OR: [{ provider: 'MANUAL' }, { provider: { not: 'MANUAL' }, lastSyncedAt: { gt: cutoff } }],
        });
        expect(publicMatch({ lastSyncedAt: new Date(cutoff.getTime() + 1) })).toMatchObject({
            isLive: true, liveStatusExpiresAt: new Date(now.getTime() + 1).toISOString(),
        });
        expect(publicMatch({ lastSyncedAt: cutoff })).toMatchObject({
            status: MatchStatus.LIVE, isLive: false, liveStatusExpiresAt: now.toISOString(),
        });
        expect(publicMatch({ lastSyncedAt: null }).isLive).toBe(false);
    });

    it('does not expire an editorial live match or a completed result', () => {
        expect(publicMatch({ provider: 'MANUAL', lastSyncedAt: null })).toMatchObject({ isLive: true, liveStatusExpiresAt: null });
        expect(publicMatch({ status: MatchStatus.FINISHED })).toMatchObject({ isLive: false, liveStatusExpiresAt: null });
    });
});

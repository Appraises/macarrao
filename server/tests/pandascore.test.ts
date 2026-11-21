import { MatchStatus } from '@prisma/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/utils/config', () => ({
    PANDASCORE_TOKEN: 'ps_test',
    PANDASCORE_API_BASE: 'https://api.pandascore.test',
    PANDASCORE_GAMES: ['csgo', 'valorant'],
    PANDASCORE_MIN_TIER: 'a',
    PANDASCORE_BR_MIN_TIER: 'b',
    ESPORTS_FOCUS_KEYWORDS: ['cblol', 'brazil'],
    ESPORTS_FOCUS_TEAMS: ['furia', 'loud'],
}));

import { isRelevantPandaScoreMatch, mapPandaScoreMatch, PandaScoreProvider } from '../src/services/esports/pandascore';

const team = (id: number, name: string, location: string | null, extra: Record<string, unknown> = {}) => ({
    type: 'Team',
    opponent: { id, name, acronym: null, location, image_url: `https://cdn.pandascore.test/${id}.png`, dark_mode_image_url: null, ...extra },
});

const row = (overrides: Record<string, unknown> = {}) => ({
    id: 1001,
    name: 'Grand final: FURIA vs NAVI',
    status: 'finished',
    begin_at: '2026-11-19T18:00:00Z',
    scheduled_at: '2026-11-19T18:00:00Z',
    match_type: 'best_of',
    number_of_games: 5,
    opponents: [team(1, 'FURIA', 'BR', { dark_mode_image_url: 'https://cdn.pandascore.test/1-dark.png' }), team(2, 'Natus Vincere', 'UA')],
    results: [{ team_id: 1, score: 3 }, { team_id: 2, score: 1 }],
    league: { id: 10, name: 'IEM', image_url: 'https://cdn.pandascore.test/iem.png', url: 'https://iem.gg' },
    serie: { id: 20, full_name: 'Rio 2026', begin_at: '2026-11-10T00:00:00Z', end_at: '2026-11-19T23:00:00Z' },
    tournament: { id: 30, name: 'Playoffs', tier: 's', region: 'SA', prizepool: '1000000 United States Dollar' },
    streams_list: [
        { raw_url: 'https://twitch.tv/eslcs', language: 'en', main: true, official: true },
        { raw_url: 'https://twitch.tv/gaules', language: 'pt', main: false, official: true },
    ],
    ...overrides,
});

describe('PandaScore mapping', () => {
    it('maps an event, its stage, logos, scores and the Portuguese stream', () => {
        expect(mapPandaScoreMatch('csgo', row())).toMatchObject({
            externalId: 'csgo:1001',
            gameAliases: expect.arrayContaining(['cs2']),
            tournament: {
                externalId: 'csgo:serie:20', name: 'IEM Rio 2026', tier: 's', region: 'SA',
                logo: 'https://cdn.pandascore.test/iem.png', prizePool: 'US$ 1.000.000',
            },
            teamA: { name: 'FURIA', country: 'br', logo: 'https://cdn.pandascore.test/1-dark.png' },
            teamB: { name: 'Natus Vincere', country: 'ua', logo: 'https://cdn.pandascore.test/2.png' },
            status: MatchStatus.FINISHED,
            scoreA: 3,
            scoreB: 1,
            bestOf: 5,
            stage: 'Playoffs',
            round: 'Grand final',
            streamUrl: 'https://twitch.tv/gaules',
        });
    });

    it('does not repeat the league in the event name or show scores before the start', () => {
        const mapped = mapPandaScoreMatch('lol', row({
            status: 'not_started', results: [{ team_id: 1, score: 0 }, { team_id: 2, score: 0 }],
            league: { id: 11, name: 'CBLOL' }, serie: { id: 21, full_name: 'CBLOL 2026 Split 2' },
        }));
        expect(mapped).toMatchObject({ tournament: { name: 'CBLOL 2026 Split 2' }, status: MatchStatus.SCHEDULED, scoreA: null, scoreB: null });
    });

    it('skips matches without two teams yet', () => {
        expect(mapPandaScoreMatch('csgo', row({ opponents: [team(1, 'FURIA', 'BR')] }))).toBeNull();
    });
});

describe('PandaScore relevance filter', () => {
    const mapped = (overrides: Record<string, unknown>) => mapPandaScoreMatch('csgo', row(overrides))!;
    const foreign = [team(3, 'G2 Esports', 'EU'), team(2, 'Natus Vincere', 'UA')];

    it('always keeps S and A tier events', () => {
        expect(isRelevantPandaScoreMatch(mapped({ opponents: foreign, tournament: { name: 'Playoffs', tier: 'a' } }))).toBe(true);
    });

    it('keeps tier B only with a Brazilian team or league', () => {
        expect(isRelevantPandaScoreMatch(mapped({ tournament: { name: 'Groups', tier: 'b' } }))).toBe(true);
        expect(isRelevantPandaScoreMatch(mapped({ opponents: foreign, tournament: { name: 'Groups', tier: 'b' } }))).toBe(false);
    });

    it('drops lower tiers, unranked events and canceled matches even with Brazilian teams', () => {
        expect(isRelevantPandaScoreMatch(mapped({ tournament: { name: 'Qualifier', tier: 'c' } }))).toBe(false);
        expect(isRelevantPandaScoreMatch(mapped({ tournament: { name: 'Cup', tier: 'unranked' } }))).toBe(false);
        expect(isRelevantPandaScoreMatch(mapped({ status: 'canceled' }))).toBe(false);
    });
});

describe('PandaScore snapshot', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('asks only for tiered tournaments, then their matches, and survives one game failing', async () => {
        const calls: URL[] = [];
        vi.stubGlobal('fetch', vi.fn(async (input: URL) => {
            const url = new URL(input);
            calls.push(url);
            if (url.pathname.startsWith('/valorant/')) return new Response('down', { status: 503 });
            if (url.pathname === '/csgo/tournaments/running') return Response.json([{ id: 30 }, { id: 31 }]);
            if (url.pathname.startsWith('/csgo/tournaments/')) return Response.json([{ id: 30 }]);
            if (url.pathname === '/csgo/matches') return Response.json([row()]);
            return Response.json([]);
        }));

        const snapshot = await new PandaScoreProvider().fetchSnapshot();

        const tournamentCalls = calls.filter((url) => url.pathname.startsWith('/csgo/tournaments/'));
        expect(tournamentCalls).toHaveLength(3);
        expect(tournamentCalls.every((url) => url.searchParams.get('filter[tier]') === 's,a,b')).toBe(true);
        const matchCall = calls.find((url) => url.pathname === '/csgo/matches')!;
        expect(matchCall.searchParams.get('filter[tournament_id]')).toBe('30,31');
        expect(vi.mocked(fetch).mock.calls[0][1]).toMatchObject({ headers: { Authorization: 'Bearer ps_test' } });
        expect(snapshot.matches).toHaveLength(1);
        expect(snapshot.warnings).toEqual([expect.stringContaining('HTTP 503')]);
    });

    it('fails the run only when every game fails', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 503 })));
        await expect(new PandaScoreProvider().fetchSnapshot()).rejects.toThrow('HTTP 503');
    });
});

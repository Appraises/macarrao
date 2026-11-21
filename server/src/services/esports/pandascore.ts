import { EsportsProvider, MatchStatus } from '@prisma/client';
import {
    PANDASCORE_API_BASE,
    PANDASCORE_GAMES,
    PANDASCORE_MIN_TIER,
    PANDASCORE_BR_MIN_TIER,
    PANDASCORE_TOKEN,
} from '../../utils/config';
import { isBrazilFocusedMatch } from './focus';
import { EsportsProviderClient, ProviderMatch, ProviderSnapshot, ProviderTeam } from './provider';

type JsonRecord = Record<string, any>;

// URL prefix on PandaScore -> names/slugs our Game table may use for that title.
const gameAliases: Record<string, string[]> = {
    csgo: ['cs2', 'counter-strike-2', 'counter strike 2', 'counter-strike'],
    valorant: ['valorant'],
    lol: ['league-of-legends', 'lol', 'league of legends'],
    dota2: ['dota-2', 'dota 2', 'dota2'],
    r6siege: ['rainbow-six-siege', 'rainbow six siege', 'r6'],
    rl: ['rocket-league', 'rocket league'],
};
const gameNames: Record<string, string> = {
    csgo: 'CS2',
    valorant: 'Valorant',
    lol: 'League of Legends',
    dota2: 'Dota 2',
    r6siege: 'Rainbow Six Siege',
    rl: 'Rocket League',
};

// S is the most prestigious tier and D the lowest (PandaScore assigns them per
// tournament from organizer, team level and prize pool).
const TIERS = ['s', 'a', 'b', 'c', 'd'] as const;
type Tier = typeof TIERS[number];
const tierRank = (tier: unknown): number => {
    const index = TIERS.indexOf(String(tier || '').toLowerCase() as Tier);
    return index === -1 ? TIERS.length : index;
};
const tiersUpTo = (minimum: string) => TIERS.slice(0, tierRank(minimum) + 1);

const asObject = (value: unknown): JsonRecord => value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
const asArray = (value: unknown): JsonRecord[] => Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') as JsonRecord[] : [];
const asText = (...values: unknown[]): string => {
    for (const value of values) if (typeof value === 'string' && value.trim()) return value.trim();
    return '';
};
const asId = (value: unknown): string => (typeof value === 'number' || (typeof value === 'string' && value)) ? String(value) : '';
const parseDate = (value: unknown): Date | null => {
    if (typeof value !== 'string' || !value.trim()) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const mapStatus = (value: unknown): MatchStatus => {
    switch (asText(value)) {
        case 'running': return MatchStatus.LIVE;
        case 'finished': return MatchStatus.FINISHED;
        case 'canceled': return MatchStatus.CANCELED;
        default: return MatchStatus.SCHEDULED; // not_started, postponed
    }
};

const mapTeam = (opponent: JsonRecord): ProviderTeam => {
    const team = asObject(opponent.opponent);
    return {
        externalId: `team:${asId(team.id)}`,
        name: asText(team.name, team.acronym, 'A definir'),
        country: asText(team.location).toLowerCase() || 'xx',
        // The site is dark: prefer the logo variant drawn for dark backgrounds.
        logo: asText(team.dark_mode_image_url, team.image_url) || null,
        sourceUrl: null,
    };
};

// Prefer an official Portuguese stream, then the main one, then any.
const pickStream = (value: unknown): string | null => {
    const streams = asArray(value).filter((stream) => /^https?:\/\//i.test(asText(stream.raw_url)));
    const portuguese = (stream: JsonRecord) => asText(stream.language).toLowerCase().startsWith('pt');
    const best = streams.find((stream) => portuguese(stream) && stream.official)
        ?? streams.find(portuguese)
        ?? streams.find((stream) => stream.main)
        ?? streams[0];
    return best ? asText(best.raw_url) : null;
};

// "IEM" + "Cologne 2026" -> "IEM Cologne 2026"; avoids "CBLOL CBLOL 2026".
const eventName = (league: JsonRecord, serie: JsonRecord): string => {
    const leagueName = asText(league.name);
    const serieName = asText(serie.full_name, serie.name, serie.year && String(serie.year));
    if (!serieName) return leagueName;
    if (!leagueName || serieName.toLowerCase().startsWith(leagueName.toLowerCase())) return serieName;
    return `${leagueName} ${serieName}`;
};

const formatPrize = (value: unknown): string | null => {
    const raw = asText(value);
    const match = raw.match(/^(\d+)\s+(.+)$/);
    if (!match) return raw || null;
    const symbol: Record<string, string> = { 'united states dollar': 'US$', euro: '€', 'brazilian real': 'R$' };
    const currency = symbol[match[2].toLowerCase()];
    const amount = Number(match[1]).toLocaleString('pt-BR');
    return currency ? `${currency} ${amount}` : `${amount} ${match[2]}`;
};

export const mapPandaScoreMatch = (game: string, row: JsonRecord): ProviderMatch | null => {
    const opponents = asArray(row.opponents).filter((item) => item.type === 'Team');
    const scheduledAt = parseDate(row.begin_at) ?? parseDate(row.scheduled_at);
    const id = asId(row.id);
    if (!id || !scheduledAt || opponents.length < 2) return null;

    const league = asObject(row.league);
    const serie = asObject(row.serie);
    const tournament = asObject(row.tournament);
    const name = eventName(league, serie);
    const serieId = asId(serie.id ?? row.serie_id);
    if (!name || !serieId) return null;

    const teamA = mapTeam(opponents[0]);
    const teamB = mapTeam(opponents[1]);
    const scoreFor = (team: ProviderTeam) => {
        const teamId = team.externalId.slice('team:'.length);
        const result = asArray(row.results).find((item) => asId(item.team_id) === teamId);
        return typeof result?.score === 'number' ? result.score : null;
    };
    const status = mapStatus(row.status);
    const started = status === MatchStatus.LIVE || status === MatchStatus.FINISHED;
    const roundLabel = asText(row.name).split(':')[0]?.trim();

    return {
        externalId: `${game}:${id}`,
        gameWiki: game,
        gameName: gameNames[game] ?? game,
        gameAliases: gameAliases[game] ?? [game],
        tournament: {
            // Our tournament is the event (PandaScore "serie"); its stages
            // (groups, playoffs) become the match stage.
            externalId: `${game}:serie:${serieId}`,
            gameWiki: game,
            name,
            slugSeed: `${game}-${name}`,
            sourceUrl: asText(league.url) || '',
            startAt: parseDate(serie.begin_at),
            endAt: parseDate(serie.end_at),
            location: asText(tournament.region) || null,
            logo: asText(league.image_url) || null,
            prizePool: formatPrize(tournament.prizepool),
            tier: asText(tournament.tier).toLowerCase() || null,
            region: asText(tournament.region) || null,
        },
        teamA,
        teamB,
        scheduledAt,
        status,
        scoreA: started ? scoreFor(teamA) : null,
        scoreB: started ? scoreFor(teamB) : null,
        bestOf: row.match_type === 'best_of' && typeof row.number_of_games === 'number' ? row.number_of_games : null,
        stage: asText(tournament.name) || null,
        round: roundLabel && roundLabel !== asText(row.name) ? roundLabel : null,
        streamUrl: pickStream(row.streams_list),
        vodUrl: null,
        sourceUrl: '',
    };
};

/**
 * PandaScore lists every qualifier and amateur cup, so the feed is curated:
 * tiers S/A always enter; lower tiers only when a Brazilian team or league is
 * involved, and never below PANDASCORE_BR_MIN_TIER.
 */
export const isRelevantPandaScoreMatch = (match: ProviderMatch, minTier = PANDASCORE_MIN_TIER, brMinTier = PANDASCORE_BR_MIN_TIER): boolean => {
    if (match.status === MatchStatus.CANCELED) return false;
    if (match.teamA.name === 'A definir' || match.teamB.name === 'A definir') return false;
    const rank = tierRank(match.tournament.tier);
    if (rank <= tierRank(minTier)) return true;
    return rank <= tierRank(brMinTier) && isBrazilFocusedMatch(match);
};

const request = async (path: string, params: Record<string, string>): Promise<{ rows: JsonRecord[]; next: boolean }> => {
    const url = new URL(`${PANDASCORE_API_BASE}${path}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${PANDASCORE_TOKEN}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`PandaScore ${path} respondeu HTTP ${response.status}.`);
    const rows = await response.json();
    return { rows: Array.isArray(rows) ? rows : [], next: /rel="next"/.test(response.headers.get('link') || '') };
};

const collect = async (path: string, params: Record<string, string>, maxPages: number) => {
    const rows: JsonRecord[] = [];
    for (let page = 1; page <= maxPages; page++) {
        const result = await request(path, { ...params, per_page: '100', page: String(page) });
        rows.push(...result.rows);
        if (!result.next) break;
    }
    return rows;
};

const DAY = 86_400_000;
const isoRange = (fromDays: number, toDays: number) =>
    `${new Date(Date.now() + fromDays * DAY).toISOString()},${new Date(Date.now() + toDays * DAY).toISOString()}`;

const fetchGame = async (game: string): Promise<{ fetched: number; matches: ProviderMatch[] }> => {
    // 1. Only tournaments (stages) at a tier we could ever show.
    const tier = tiersUpTo(PANDASCORE_BR_MIN_TIER).join(',');
    const tournaments = [
        ...await collect(`/${game}/tournaments/running`, { 'filter[tier]': tier }, 2),
        ...await collect(`/${game}/tournaments/upcoming`, { 'filter[tier]': tier, 'range[begin_at]': isoRange(0, 14) }, 2),
        ...await collect(`/${game}/tournaments/past`, { 'filter[tier]': tier, 'range[end_at]': isoRange(-3, 0) }, 1),
    ];
    const ids = [...new Set(tournaments.map((item) => asId(item.id)).filter(Boolean))];

    // 2. Their matches from three days ago to two weeks ahead.
    const rows: JsonRecord[] = [];
    for (let index = 0; index < ids.length; index += 50) {
        rows.push(...await collect(`/${game}/matches`, {
            'filter[tournament_id]': ids.slice(index, index + 50).join(','),
            'range[begin_at]': isoRange(-3, 14),
            sort: 'begin_at',
        }, 4));
    }
    const matches = rows.map((row) => mapPandaScoreMatch(game, row)).filter((item): item is ProviderMatch => item !== null);
    return { fetched: rows.length, matches };
};

export class PandaScoreProvider implements EsportsProviderClient {
    readonly key = EsportsProvider.PANDASCORE;
    readonly label = 'PandaScore';
    readonly slugPrefix = 'ps';
    readonly games = PANDASCORE_GAMES;
    readonly configured = Boolean(PANDASCORE_TOKEN);

    accepts(match: ProviderMatch) {
        return isRelevantPandaScoreMatch(match);
    }

    async fetchSnapshot(): Promise<ProviderSnapshot> {
        if (!this.configured) return { fetched: 0, matches: [] };
        let fetched = 0;
        const matches: ProviderMatch[] = [];
        const failures: string[] = [];
        // One game failing (timeout, outage) must not drop the other games.
        for (const game of this.games) {
            try {
                const result = await fetchGame(game);
                fetched += result.fetched;
                matches.push(...result.matches);
            } catch (error) {
                failures.push(error instanceof Error ? error.message : `PandaScore ${game}: erro desconhecido.`);
            }
        }
        if (failures.length === this.games.length && failures.length) throw new Error(failures.join(' | '));
        return { fetched, matches, warnings: failures };
    }
}

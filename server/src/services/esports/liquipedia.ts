import { EsportsProvider, MatchStatus } from '@prisma/client';
import {
    LIQUIPEDIA_API_BASE,
    LIQUIPEDIA_API_KEY,
    LIQUIPEDIA_USER_AGENT,
    ESPORTS_SYNC_WIKIS,
} from '../../utils/config';
import { isBrazilFocusedMatch } from './focus';
import { EsportsProviderClient, ProviderMatch, ProviderSnapshot, ProviderTeam } from './provider';

type JsonRecord = Record<string, any>;

const queryFields = [
    'pagename', 'match2id', 'date', 'dateexact', 'finished', 'status', 'bestof', 'winner',
    'tournament', 'parent', 'parentname', 'tickername', 'shortname', 'icon', 'stream', 'vod',
    'match2opponents', 'match2bracketdata', 'match2bracketid',
].join(',');

const wikiGameAliases: Record<string, string[]> = {
    valorant: ['valorant'],
    counterstrike: ['cs2', 'counter-strike-2', 'counter strike 2', 'counter-strike'],
    leagueoflegends: ['league-of-legends', 'lol', 'league of legends'],
    freefire: ['free-fire', 'free fire'],
    rainbowsix: ['rainbow-six-siege', 'rainbow six siege', 'r6'],
    rocketleague: ['rocket-league', 'rocket league'],
};

export const aliasesForLiquipediaWiki = (wiki: string): string[] => wikiGameAliases[wiki] || [wiki];

const asObject = (value: unknown): JsonRecord => value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
const asArray = (value: unknown): JsonRecord[] => Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') as JsonRecord[] : [];
const asText = (...values: unknown[]): string => {
    for (const value of values) if (typeof value === 'string' && value.trim()) return value.trim();
    return '';
};
const asNumber = (value: unknown): number | null => {
    if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};
const slugPart = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const assetUrl = (wiki: string, value: unknown): string | null => {
    const file = asText(value);
    if (!file) return null;
    if (/^https?:\/\//i.test(file)) return file;
    return `https://liquipedia.net/${wiki}/Special:Redirect/file/${encodeURIComponent(file)}`;
};

const streamUrl = (value: unknown): string | null => {
    if (typeof value === 'string' && /^https?:\/\//i.test(value)) return value;
    const streams = asObject(value);
    for (const [platform, raw] of Object.entries(streams)) {
        const channel = typeof raw === 'string' ? raw : asText(asObject(raw).channel, asObject(raw).link);
        if (!channel) continue;
        if (/^https?:\/\//i.test(channel)) return channel;
        if (platform.toLowerCase().includes('twitch')) return `https://www.twitch.tv/${channel}`;
        if (platform.toLowerCase().includes('youtube')) return `https://www.youtube.com/${channel}`;
    }
    return null;
};

const countryFromOpponent = (opponent: JsonRecord): string => asText(
    opponent.country,
    opponent.flag,
    asObject(opponent.extradata).country,
    asObject(opponent.extradata).flag,
).toLowerCase() || 'xx';

const mapTeam = (wiki: string, opponent: JsonRecord, fallback: string): ProviderTeam => {
    const name = asText(opponent.name, opponent.template, fallback);
    const template = asText(opponent.template, name);
    return {
        externalId: `${wiki}:${template}`,
        name,
        country: countryFromOpponent(opponent),
        logo: assetUrl(wiki, opponent.icon || asObject(opponent.extradata).icon),
        sourceUrl: template ? `https://liquipedia.net/${wiki}/${template.replace(/ /g, '_')}` : null,
    };
};

const parseDate = (value: unknown): Date | null => {
    if (typeof value !== 'string' || !value.trim()) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const mapStatus = (row: JsonRecord): MatchStatus => {
    const status = asText(row.status).toLowerCase();
    if (status.includes('cancel') || status === 'notplayed') return MatchStatus.CANCELED;
    if (row.finished === true || row.finished === 1 || row.finished === '1' || status === 'finished') return MatchStatus.FINISHED;
    if (status === 'live' || status === 'ongoing' || status === 'running') return MatchStatus.LIVE;
    return MatchStatus.SCHEDULED;
};

export const mapLiquipediaMatch = (wiki: string, row: JsonRecord): ProviderMatch | null => {
    const scheduledAt = parseDate(row.date);
    const opponents = asArray(row.match2opponents);
    if (!scheduledAt || opponents.length < 2) return null;

    const parent = asText(row.parent, row.pagename, row.tournament);
    const tournamentName = asText(row.parentname, row.tournament, row.tickername, parent);
    const externalMatchId = asText(row.match2id, row.pagename);
    if (!parent || !externalMatchId || !tournamentName) return null;

    const teamA = mapTeam(wiki, opponents[0], 'TBD');
    const teamB = mapTeam(wiki, opponents[1], 'TBD');
    const status = mapStatus(row);
    const bracket = asObject(row.match2bracketdata);
    const matchSource = `https://liquipedia.net/${wiki}/Match:${encodeURIComponent(externalMatchId)}`;
    const tournamentSource = `https://liquipedia.net/${wiki}/${parent.replace(/ /g, '_')}`;

    return {
        externalId: `${wiki}:${externalMatchId}`,
        gameWiki: wiki,
        gameAliases: aliasesForLiquipediaWiki(wiki),
        tournament: {
            externalId: `${wiki}:${parent}`,
            gameWiki: wiki,
            name: tournamentName,
            slugSeed: `${wiki}-${slugPart(parent)}`,
            sourceUrl: tournamentSource,
            startAt: scheduledAt,
            endAt: scheduledAt,
            location: asText(bracket.location) || null,
            logo: assetUrl(wiki, row.icon),
        },
        teamA,
        teamB,
        scheduledAt,
        status,
        scoreA: asNumber(opponents[0].score),
        scoreB: asNumber(opponents[1].score),
        bestOf: asNumber(row.bestof),
        stage: asText(bracket.section, bracket.stage) || null,
        round: asText(bracket.round, bracket.header) || null,
        streamUrl: streamUrl(row.stream),
        vodUrl: asText(row.vod) || null,
        sourceUrl: matchSource,
    };
};

const dateCondition = () => {
    const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const to = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return `[[date::>${from}]] AND [[date::<${to}]]`;
};

const fetchWiki = async (wiki: string): Promise<{ fetched: number; matches: ProviderMatch[] }> => {
    const url = new URL(`${LIQUIPEDIA_API_BASE}/match2`);
    url.searchParams.set('wiki', wiki);
    url.searchParams.set('conditions', dateCondition());
    url.searchParams.set('query', queryFields);
    url.searchParams.set('order', 'date asc');
    url.searchParams.set('limit', '500');
    url.searchParams.set('offset', '0');

    const response = await fetch(url, {
        headers: {
            Authorization: `Apikey ${LIQUIPEDIA_API_KEY}`,
            Accept: 'application/json',
            'User-Agent': LIQUIPEDIA_USER_AGENT,
        },
        signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`Liquipedia ${wiki} respondeu HTTP ${response.status}.`);
    const payload = await response.json() as JsonRecord;
    if (payload.error) throw new Error(`Liquipedia ${wiki}: ${asText(payload.error.message, payload.error) || 'erro desconhecido'}`);
    const rows = Array.isArray(payload.result) ? payload.result : [];
    return { fetched: rows.length, matches: rows.map((row) => mapLiquipediaMatch(wiki, row)).filter((item): item is ProviderMatch => item !== null) };
};

export class LiquipediaProvider implements EsportsProviderClient {
    readonly key = EsportsProvider.LIQUIPEDIA;
    readonly label = 'Liquipedia';
    readonly slugPrefix = 'liquipedia';
    readonly games = ESPORTS_SYNC_WIKIS;
    readonly configured = Boolean(LIQUIPEDIA_API_KEY);

    // The Liquipedia feed is Brazil-only coverage.
    accepts(match: ProviderMatch) {
        return isBrazilFocusedMatch(match);
    }

    async fetchSnapshot(): Promise<ProviderSnapshot> {
        if (!this.configured) return { fetched: 0, matches: [] };
        const snapshots: Array<{ fetched: number; matches: ProviderMatch[] }> = [];
        for (const wiki of ESPORTS_SYNC_WIKIS) snapshots.push(await fetchWiki(wiki));
        return {
            fetched: snapshots.reduce((total, item) => total + item.fetched, 0),
            matches: snapshots.flatMap((item) => item.matches),
        };
    }
}

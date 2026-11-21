import api from '../src/services/api';
import { prizeDistributions } from './esportsPrizeDistributions';
import type {
  BracketMatch,
  EsportsNews,
  EsportsOverview,
  Match,
  PickemEntry,
  PickemLeaderboardRow,
  PickemPrediction,
  PlayerStat,
  TeamRanking,
  Tournament,
  TournamentDetail,
} from '../types';

const API_ORIGIN = (() => {
  try {
    return new URL(import.meta.env.VITE_API_URL || 'http://localhost:3001').origin;
  } catch {
    return 'http://localhost:3001';
  }
})();

const normalizeMediaUrl = (raw?: string | null): string | null => {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const isLocalHost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (isLocalHost && url.pathname.startsWith('/uploads/')) {
      return `${API_ORIGIN}${url.pathname}${url.search}`;
    }
  } catch {
    return raw;
  }
  return raw;
};

export const isCurrentLiveMatch = (match: Match, now = Date.now()): boolean =>
  match.status === 'LIVE'
  && match.isLive !== false
  && (!match.liveStatusExpiresAt || Date.parse(match.liveStatusExpiresAt) > now);

const normalizeMatch = (raw: any): Match => {
  const scheduledAt = raw.scheduledAt || null;
  const instant = scheduledAt ? new Date(scheduledAt) : null;
  return {
    id: raw.id,
    externalId: raw.externalId,
    provider: raw.provider,
    sourceUrl: raw.sourceUrl,
    gameId: raw.gameId || raw.game?.id || null,
    game: typeof raw.game === 'string' ? raw.game : raw.game?.name || 'E-sports',
    gameImage: normalizeMediaUrl(raw.gameImage || (typeof raw.game === 'object' ? raw.game?.image : null)),
    gameSlug: raw.gameSlug || (typeof raw.game === 'object' ? raw.game?.slug : null),
    tournamentId: raw.tournamentId || raw.tournament?.id || null,
    tournamentSlug: raw.tournament?.slug || null,
    competition: raw.competition || raw.tournament?.name || 'Competicao',
    stage: raw.stage,
    round: raw.round,
    region: raw.region,
    isBrazilFocused: raw.isBrazilFocused,
    teamA: raw.teamA
      ? { ...raw.teamA, logo: normalizeMediaUrl(raw.teamA.logo) }
      : { name: raw.teamAName || 'TBD', country: raw.teamACountry || 'xx', logo: normalizeMediaUrl(raw.teamALogo) },
    teamB: raw.teamB
      ? { ...raw.teamB, logo: normalizeMediaUrl(raw.teamB.logo) }
      : { name: raw.teamBName || 'TBD', country: raw.teamBCountry || 'xx', logo: normalizeMediaUrl(raw.teamBLogo) },
    scheduledAt,
    time: instant && !Number.isNaN(instant.getTime()) ? instant.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'A definir',
    date: instant && !Number.isNaN(instant.getTime()) ? instant.toLocaleDateString('pt-BR') : 'A definir',
    status: raw.status || 'SCHEDULED',
    isLive: raw.isLive ?? raw.status === 'LIVE',
    liveStatusExpiresAt: raw.liveStatusExpiresAt,
    scoreA: raw.scoreA,
    scoreB: raw.scoreB,
    bestOf: raw.bestOf,
    number_of_games: raw.bestOf,
    stream: raw.streamUrl,
    streamUrl: raw.streamUrl,
    vodUrl: raw.vodUrl,
    lastSyncedAt: raw.lastSyncedAt,
  };
};

const normalizeTournament = (raw: any): Tournament => ({
  ...raw,
  id: raw.id,
  name: raw.name,
  game: typeof raw.game === 'string' ? raw.game : raw.game?.name || raw.gameRecord?.name || 'E-sports',
  gameImage: normalizeMediaUrl(raw.gameImage || (typeof raw.game === 'object' ? raw.game?.image : null) || raw.gameRecord?.image),
  gameSlug: raw.gameSlug || (typeof raw.game === 'object' ? raw.game?.slug : null) || raw.gameRecord?.slug || null,
  image: normalizeMediaUrl(raw.image) || undefined,
  logo: normalizeMediaUrl(raw.logo) || undefined,
  status: raw.status || 'Upcoming',
  dates: raw.dates || [raw.startAt, raw.endAt].filter(Boolean).map((date: string) => new Date(date).toLocaleDateString('pt-BR')).join(' - ') || 'Datas a definir',
  prizePool: raw.prizePool || 'Nao informado',
});

const get = async <T>(path: string, params?: Record<string, unknown>): Promise<T> => (await api.get(`/esports${path}`, { params })).data as T;

export const esportsService = {
  getOverview: async (game?: string): Promise<EsportsOverview> => {
    const data = await get<any>('/overview', game ? { game } : undefined);
    const pastTournaments = Array.isArray(data.pastTournaments)
      ? data.pastTournaments
      : await get<any[]>('/tournaments', { status: 'Finished' }).catch(() => []);
    const tournaments = new Map<string, Tournament>();
    for (const item of [...(data.tournaments || []), ...pastTournaments]) {
      tournaments.set(item.id, normalizeTournament(item));
    }
    return {
      matches: (data.matches || []).map(normalizeMatch),
      results: (data.results || []).map(normalizeMatch),
      tournaments: [...tournaments.values()],
      rankings: (data.rankings || []).map((row: any) => ({
        ...row,
        game: typeof row.game === 'string' ? row.game : row.game?.name || 'E-sports',
        gameImage: normalizeMediaUrl(row.gameImage || (typeof row.game === 'object' ? row.game?.image : null)),
        gameSlug: row.gameSlug || (typeof row.game === 'object' ? row.game?.slug : null),
      })),
      news: (data.news || []).map((item: EsportsNews) => ({
        ...item,
        game: item.game || (item.tournamentId ? tournaments.get(item.tournamentId)?.game : null),
        image: normalizeMediaUrl(item.image) || undefined,
      })),
      source: data.source,
    };
  },

  getActiveTournaments: async (): Promise<Tournament[]> => (await get<any[]>('/tournaments')).map(normalizeTournament),

  getMatches: async (filter: 'all' | 'live' | 'upcoming' = 'all'): Promise<Match[]> =>
    (await get<any[]>('/matches', { filter })).map(normalizeMatch),

  getTournamentDetails: async (id: string): Promise<TournamentDetail | null> => {
    try {
      const data = await get<any>(`/tournaments/${encodeURIComponent(id)}`);
      const matches: Match[] = (data.matches || []).map(normalizeMatch);
      const logos = new Map([...matches.flatMap((match) => [match.teamA, match.teamB]), ...(data.teams || [])]
        .filter((team) => team.id && team.logo).map((team) => [team.id, normalizeMediaUrl(team.logo)] as const));
      const bracket: BracketMatch[] = (data.bracket || []).map((row: BracketMatch) => ({
        ...row,
        teamA: { ...row.teamA, logo: normalizeMediaUrl(row.teamA.logo) || logos.get(row.teamA.id) },
        teamB: { ...row.teamB, logo: normalizeMediaUrl(row.teamB.logo) || logos.get(row.teamB.id) },
      }));
      return {
        ...normalizeTournament(data),
        description: data.description || '',
        organizer: data.organizer || '',
        location: data.location || 'Online',
        format: data.format || '',
        teams: data.teams || [],
        standings: data.standings || [],
        prizeDistribution: data.prizeDistribution || (data.slug && Object.hasOwn(prizeDistributions, data.slug) ? prizeDistributions[data.slug] : undefined),
        bracket,
        matches,
        news: data.news || [],
        stats: data.stats || [],
        attribution: data.attribution,
      };
    } catch (error: any) {
      if (error?.response?.status === 404) return null;
      throw error;
    }
  },

  getMatchDetails: async (id: string): Promise<Match | null> => {
    try {
      return normalizeMatch(await get<any>(`/matches/${encodeURIComponent(id)}`));
    } catch (error: any) {
      if (error?.response?.status === 404) return null;
      throw error;
    }
  },

  getNews: async (tournamentId?: string): Promise<EsportsNews[]> =>
    (await get<EsportsNews[]>('/news', tournamentId ? { tournamentId } : undefined))
      .map((item) => ({ ...item, image: normalizeMediaUrl(item.image) || undefined })),
  getRankings: async (gameId?: string): Promise<TeamRanking[]> => (await get<any[]>('/rankings', gameId ? { gameId } : undefined)).map((row) => ({
    ...row,
    game: typeof row.game === 'string' ? row.game : row.game?.name || 'E-sports',
    gameImage: normalizeMediaUrl(row.gameImage || (typeof row.game === 'object' ? row.game?.image : null)),
    gameSlug: row.gameSlug || (typeof row.game === 'object' ? row.game?.slug : null),
  })),
  getPickemLeaderboard: (tournamentId: string): Promise<PickemLeaderboardRow[]> => get(`/pickem/${encodeURIComponent(tournamentId)}/leaderboard`),
  getMyPickem: (tournamentId: string): Promise<PickemEntry | null> => get(`/pickem/${encodeURIComponent(tournamentId)}/me`),
  savePickemPrediction: async (tournamentId: string, matchId: string, predictedTeamId: string): Promise<PickemPrediction> =>
    (await api.put(`/esports/pickem/${encodeURIComponent(tournamentId)}/predictions/${encodeURIComponent(matchId)}`, { predictedTeamId })).data,
  deletePickemPrediction: async (tournamentId: string, matchId: string): Promise<void> => {
    await api.delete(`/esports/pickem/${encodeURIComponent(tournamentId)}/predictions/${encodeURIComponent(matchId)}`);
  },

  getTournamentStats: async (tournamentId: string, game: string): Promise<{ players: PlayerStat[]; columns: any[] }> => {
    const data = await get<{ players: PlayerStat[] }>(`/stats/${encodeURIComponent(tournamentId)}`);
    const normalized = game.toLowerCase();
    const columns = normalized.includes('counter') || normalized.includes('cs2')
      ? [{ key: 'name', label: 'Jogador', type: 'player' }, { key: 'rating', label: 'Rating', type: 'stat', primary: true }, { key: 'kda', label: 'K/D/A', type: 'stat' }, { key: 'adr', label: 'ADR', type: 'stat' }, { key: 'maps', label: 'Mapas', type: 'stat' }]
      : normalized.includes('valorant')
        ? [{ key: 'name', label: 'Jogador', type: 'player' }, { key: 'acs', label: 'ACS', type: 'stat', primary: true }, { key: 'kda', label: 'K/D/A', type: 'stat' }, { key: 'maps', label: 'Mapas', type: 'stat' }]
        : [{ key: 'name', label: 'Jogador', type: 'player' }, { key: 'rating', label: 'Rating', type: 'stat', primary: true }, { key: 'kda', label: 'KDA', type: 'stat' }, { key: 'maps', label: 'Jogos', type: 'stat' }];
    return { players: data.players || [], columns };
  },
};

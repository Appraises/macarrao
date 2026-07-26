import api from '../src/services/api';
import type {
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
    tournamentId: raw.tournamentId || raw.tournament?.id || null,
    tournamentSlug: raw.tournament?.slug || null,
    competition: raw.competition || raw.tournament?.name || 'Competicao',
    stage: raw.stage,
    round: raw.round,
    region: raw.region,
    isBrazilFocused: raw.isBrazilFocused,
    teamA: raw.teamA || { name: raw.teamAName || 'TBD', country: raw.teamACountry || 'xx', logo: raw.teamALogo },
    teamB: raw.teamB || { name: raw.teamBName || 'TBD', country: raw.teamBCountry || 'xx', logo: raw.teamBLogo },
    scheduledAt,
    time: instant && !Number.isNaN(instant.getTime()) ? instant.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'A definir',
    date: instant && !Number.isNaN(instant.getTime()) ? instant.toLocaleDateString('pt-BR') : 'A definir',
    status: raw.status || 'SCHEDULED',
    isLive: raw.status === 'LIVE' || raw.isLive === true,
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
  status: raw.status || 'Upcoming',
  dates: raw.dates || [raw.startAt, raw.endAt].filter(Boolean).map((date: string) => new Date(date).toLocaleDateString('pt-BR')).join(' - ') || 'Datas a definir',
  prizePool: raw.prizePool || 'Nao informado',
});

const get = async <T>(path: string, params?: Record<string, unknown>): Promise<T> => (await api.get(`/esports${path}`, { params })).data as T;

export const esportsService = {
  getOverview: async (): Promise<EsportsOverview> => {
    const data = await get<any>('/overview');
    return {
      matches: (data.matches || []).map(normalizeMatch),
      results: (data.results || []).map(normalizeMatch),
      tournaments: (data.tournaments || []).map(normalizeTournament),
      rankings: (data.rankings || []).map((row: any) => ({ ...row, game: typeof row.game === 'string' ? row.game : row.game?.name || 'E-sports' })),
      news: data.news || [],
      source: data.source,
    };
  },

  getActiveTournaments: async (): Promise<Tournament[]> => (await get<any[]>('/tournaments')).map(normalizeTournament),

  getMatches: async (filter: 'all' | 'live' | 'upcoming' = 'all'): Promise<Match[]> =>
    (await get<any[]>('/matches', { filter })).map(normalizeMatch),

  getTournamentDetails: async (id: string): Promise<TournamentDetail | null> => {
    try {
      const data = await get<any>(`/tournaments/${encodeURIComponent(id)}`);
      return {
        ...normalizeTournament(data),
        description: data.description || '',
        organizer: data.organizer || '',
        location: data.location || 'Online',
        format: data.format || '',
        teams: data.teams || [],
        standings: data.standings || [],
        bracket: data.bracket || [],
        matches: (data.matches || []).map(normalizeMatch),
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

  getNews: (tournamentId?: string): Promise<EsportsNews[]> => get('/news', tournamentId ? { tournamentId } : undefined),
  getRankings: async (gameId?: string): Promise<TeamRanking[]> => (await get<any[]>('/rankings', gameId ? { gameId } : undefined)).map((row) => ({ ...row, game: typeof row.game === 'string' ? row.game : row.game?.name || 'E-sports' })),
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

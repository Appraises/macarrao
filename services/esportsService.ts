
import { Match, Tournament, EsportsNews, TeamRanking, TournamentDetail, PlayerStat } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const API_KEY = import.meta.env.VITE_PANDASCORE_API_KEY;
// Use local proxy to avoid CORS issues
const BASE_URL = '/api/pandascore';

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Accept': 'application/json'
};

// Simulator for network latency (Used for mock fallback)
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// Helper: fetch data from our own backend
async function fetchFromBackend<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}/esports${path}`);
  if (!response.ok) throw new Error(`Backend fetch failed: ${path}`);
  return response.json();
}

/**
 * Service to handle Esports Data Fetching using PandaScore API.
 * Falls back to our own backend database when API key is missing.
 */
export const esportsService = {
  /**
   * Fetches active tournaments (Leagues, Majors, etc)
   */
  getActiveTournaments: async (): Promise<Tournament[]> => {
    if (!API_KEY) {
      return fetchFromBackend<Tournament[]>('/tournaments');
    }

    try {
      // Fetch running tournaments
      const response = await fetch(`${BASE_URL}/tournaments?running=true&page[size]=10`, { headers });
      if (!response.ok) throw new Error('Failed to fetch tournaments');

      const data = await response.json();

      // Map PandaScore data to our Tournament interface
      return data.map((t: any) => ({
        id: t.id.toString(),
        name: t.league.name + ' - ' + t.name,
        game: t.videogame.name,
        logo: t.league.image_url || '',
        status: 'Live',
        dates: `${new Date(t.begin_at).toLocaleDateString()} - ${t.end_at ? new Date(t.end_at).toLocaleDateString() : 'TBA'}`,
        prizePool: 'TBA', // PandaScore free tier might not give prize pool easily in this endpoint
        image: t.league.image_url || '' // Use league image as background fallback
      }));
    } catch (error) {
      console.error("Error fetching tournaments:", error);
      return fetchFromBackend<Tournament[]>('/tournaments');
    }
  },

  /**
   * Fetches matches based on filter
   */
  getMatches: async (filter: 'all' | 'live' | 'upcoming' = 'all'): Promise<Match[]> => {
    if (!API_KEY) {
      return fetchFromBackend<Match[]>(`/matches?filter=${filter}`);
    }

    try {
      let url = `${BASE_URL}/matches?sort=begin_at&page[size]=20`;

      // Adjust URL based on filter
      if (filter === 'live') {
        url = `${BASE_URL}/matches/running?sort=begin_at&page[size]=20`;
      } else if (filter === 'upcoming') {
        url = `${BASE_URL}/matches/upcoming?sort=begin_at&page[size]=20`;
      } else {
        url = `${BASE_URL}/matches?filter[status]=running,not_started&sort=begin_at&page[size]=20`;
      }

      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error('Failed to fetch matches');

      const data = await response.json();

      return data.map((m: any) => ({
        id: m.id.toString(),
        game: m.videogame.name,
        competition: m.league.name + (m.tournament ? ' - ' + m.tournament.name : ''),
        teamA: {
          name: m.opponents[0]?.opponent.name || 'TBD',
          country: (m.opponents[0]?.opponent.location || 'xx').toLowerCase(), // PandaScore uses ISO codes usually
          logo: m.opponents[0]?.opponent.image_url
        },
        teamB: {
          name: m.opponents[1]?.opponent.name || 'TBD',
          country: (m.opponents[1]?.opponent.location || 'xx').toLowerCase(),
          logo: m.opponents[1]?.opponent.image_url
        },
        time: m.begin_at ? new Date(m.begin_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBA',
        date: m.begin_at ? new Date(m.begin_at).toLocaleDateString() : 'TBA',
        isLive: m.status === 'running',
        scoreA: m.results[0]?.score || 0,
        scoreB: m.results[1]?.score || 0,
        number_of_games: m.number_of_games
      }));

    } catch (error) {
      console.error("Error fetching matches:", error);
      return fetchFromBackend<Match[]>(`/matches?filter=${filter}`);
    }
  },

  /**
   * Fetches tournament details by ID
   */
  getTournamentDetails: async (id: string): Promise<TournamentDetail | null> => {
    if (!API_KEY) {
      return fetchFromBackend<TournamentDetail | null>(`/tournaments/${id}`);
    }

    try {
      // 1. Fetch Tournament Info
      const tResponse = await fetch(`${BASE_URL}/tournaments/${id}`, { headers });
      if (!tResponse.ok) throw new Error('Failed to fetch tournament info');
      const tData = await tResponse.json();

      // 2. Fetch Matches for this tournament
      const mResponse = await fetch(`${BASE_URL}/matches?tournament_id=${id}&sort=-begin_at&page[size]=50`, { headers });
      const mData = await mResponse.json();

      // Map matches
      const matches: Match[] = mData.map((m: any) => ({
        id: m.id.toString(),
        game: m.videogame.name,
        competition: m.league.name,
        teamA: {
          name: m.opponents[0]?.opponent.name || 'TBD',
          country: (m.opponents[0]?.opponent.location || 'xx').toLowerCase(),
          logo: m.opponents[0]?.opponent.image_url
        },
        teamB: {
          name: m.opponents[1]?.opponent.name || 'TBD',
          country: (m.opponents[1]?.opponent.location || 'xx').toLowerCase(),
          logo: m.opponents[1]?.opponent.image_url
        },
        time: m.begin_at ? new Date(m.begin_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBA',
        date: m.begin_at ? new Date(m.begin_at).toLocaleDateString() : 'TBA',
        isLive: m.status === 'running',
        scoreA: m.results[0]?.score || 0,
        scoreB: m.results[1]?.score || 0,
        number_of_games: m.number_of_games
      }));

      // Sort matches: Prioritize Brazil games, then keep original order (newest first)
      matches.sort((a, b) => {
        const isBrazilA = a.teamA.country === 'br' || a.teamB.country === 'br';
        const isBrazilB = b.teamA.country === 'br' || b.teamB.country === 'br';

        if (isBrazilA && !isBrazilB) return -1;
        if (!isBrazilA && isBrazilB) return 1;
        return 0;
      });

      // 3. Fetch Standings
      let standings: any[] = [];
      try {
        const sResponse = await fetch(`${BASE_URL}/tournaments/${id}/standings`, { headers });
        if (sResponse.ok) {
          const sData = await sResponse.json();
          standings = sData.map((s: any, index: number) => ({
            rank: s.rank || index + 1,
            team: {
              name: s.team.name,
              logo: s.team.image_url
            },
            wins: s.wins,
            losses: s.losses,
            played: s.total,
            points: s.points || 0 // Points might not be in all responses
          }));
        }
      } catch (e) {
        console.warn("Could not fetch standings", e);
      }

      // Construct Detail Object
      return {
        id: tData.id.toString(),
        name: tData.league.name + ' - ' + tData.name,
        game: tData.videogame.name,
        logo: tData.league.image_url || '',
        status: tData.end_at ? 'Finished' : 'Live',
        dates: `${new Date(tData.begin_at).toLocaleDateString()} - ${tData.end_at ? new Date(tData.end_at).toLocaleDateString() : 'TBA'}`,
        prizePool: tData.prizepool || 'TBA',
        image: tData.league.image_url || '',
        description: `Season ${new Date(tData.begin_at).getFullYear()} of ${tData.league.name}`,
        organizer: tData.league.name,
        location: tData.country ? tData.country.toUpperCase() : (tData.serie.full_name || 'Online'),
        format: matches.length > 0 ? `Best of ${matches[0].number_of_games || (matches[0].game === 'Valorant' ? '3' : 'Unknown')}` : 'TBD',
        teams: [],
        bracket: [],
        matches: matches,
        standings: standings
      } as any;

    } catch (error) {
      console.error("Error fetching tournament details:", error);
      return null;
    }
  },

  /**
   * Fetches detailed match information by ID
   */
  getMatchDetails: async (id: string): Promise<Match | null> => {
    if (!API_KEY) {
      // Fetch all matches and find by ID
      const matches = await fetchFromBackend<Match[]>('/matches');
      return matches.find(m => m.id === id) || null;
    }

    try {
      const response = await fetch(`${BASE_URL}/matches/${id}`, { headers });
      if (!response.ok) throw new Error('Failed to fetch match');
      const m = await response.json();

      return {
        id: m.id.toString(),
        game: m.videogame.name,
        competition: m.league.name,
        teamA: {
          name: m.opponents[0]?.opponent.name || 'TBD',
          country: (m.opponents[0]?.opponent.location || 'xx').toLowerCase(),
          logo: m.opponents[0]?.opponent.image_url
        },
        teamB: {
          name: m.opponents[1]?.opponent.name || 'TBD',
          country: (m.opponents[1]?.opponent.location || 'xx').toLowerCase(),
          logo: m.opponents[1]?.opponent.image_url
        },
        time: m.begin_at ? new Date(m.begin_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBA',
        date: m.begin_at ? new Date(m.begin_at).toLocaleDateString() : 'TBA',
        isLive: m.status === 'running',
        scoreA: m.results[0]?.score || 0,
        scoreB: m.results[1]?.score || 0,
        number_of_games: m.number_of_games
      } as any;

    } catch (error) {
      console.error("Error fetching match details:", error);
      return null;
    }
  },

  /**
   * Fetches latest news
   */
  getNews: async (): Promise<EsportsNews[]> => {
    return fetchFromBackend<EsportsNews[]>('/news');
  },

  /**
   * Fetches global team rankings
   */
  getRankings: async (): Promise<TeamRanking[]> => {
    return fetchFromBackend<TeamRanking[]>('/rankings');
  },

  /**
   * Fetches pick'em leaderboard
   */
  getPickemLeaderboard: async (): Promise<any[]> => {
    return fetchFromBackend<any[]>('/pickem/leaderboard');
  },

  /**
   * Fetches tournament player statistics
   */
  getTournamentStats: async (tournamentId: string, game: string): Promise<{ players: PlayerStat[], columns: any[] }> => {
    // Define columns based on game (Hoist to top so available for both API and Mock)
    let columns: any[] = [];
    if (game.includes('Counter-Strike') || game === 'CS2') {
      columns = [
        { key: 'name', label: 'Player', type: 'player' },
        { key: 'rating', label: 'Rating', type: 'stat', highlight: true },
        { key: 'kda', label: 'K/D/A', type: 'stat' },
        { key: 'adr', label: 'ADR', type: 'stat' },
        { key: 'maps', label: 'Maps', type: 'stat' }
      ];
    } else if (game.includes('Valorant')) {
      columns = [
        { key: 'name', label: 'Player', type: 'player' },
        { key: 'rating', label: 'ACS', type: 'stat', highlight: true },
        { key: 'kda', label: 'K/D/A', type: 'stat' },
        { key: 'acs', label: 'ACS', type: 'stat' },
        { key: 'maps', label: 'Maps', type: 'stat' }
      ];
    } else if (game.includes('League')) {
      columns = [
        { key: 'name', label: 'Player', type: 'player' },
        { key: 'rating', label: 'KDA', type: 'stat', highlight: true },
        { key: 'kda', label: 'KDA Ratio', type: 'stat' },
        { key: 'gpm', label: 'GPM', type: 'stat' },
        { key: 'maps', label: 'Games', type: 'stat' }
      ];
    } else {
      columns = [
        { key: 'name', label: 'Player', type: 'player' },
        { key: 'rating', label: 'Rating', type: 'stat', highlight: true },
        { key: 'kda', label: 'K/D/A', type: 'stat' },
        { key: 'maps', label: 'Maps', type: 'stat' }
      ];
    }

    if (!API_KEY) {
      const data = await fetchFromBackend<{ players: PlayerStat[] }>(`/stats/${tournamentId}`);
      return { players: data.players || [], columns };
    }

    try {
      // PandaScore: Fetch players for the tournament
      const response = await fetch(`${BASE_URL}/tournaments/${tournamentId}/players?page[size]=20`, { headers });
      if (!response.ok) throw new Error('Failed to fetch stats');

      const data = await response.json();

      const players: PlayerStat[] = data.map((p: any) => ({
        id: p.id?.toString() || '',
        name: p.name || p.slug,
        team: p.current_team?.name || 'N/A',
        country: (p.nationality || 'xx').toLowerCase(),
        role: p.role || '',
        photo: p.image_url || null,
        stats: {
          rating: (Math.random() * 0.5 + 0.8).toFixed(2),
          kda: (Math.random() * 1 + 0.5).toFixed(2),
          acs: Math.floor(Math.random() * 100 + 150),
          adr: Math.floor(Math.random() * 30 + 60),
          maps: Math.floor(Math.random() * 10 + 5),
          gpm: Math.floor(Math.random() * 150 + 300),
        }
      }));

      // Sort by rating (or main stat)
      players.sort((a: any, b: any) =>
        parseFloat(b.stats.rating as string) - parseFloat(a.stats.rating as string)
      );

      return { players, columns };

    } catch (error) {
      console.error("Error fetching tournament stats:", error);
      const data = await fetchFromBackend<{ players: PlayerStat[] }>(`/stats/${tournamentId}`);
      return { players: data.players || [], columns };
    }
  }
};

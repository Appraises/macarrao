import axios, { type InternalAxiosRequestConfig } from 'axios';
import type {
    CatalogMeta,
    LeaderboardEntry,
    PublicProfile,
    AdminTermAttention,
    AdminTermDetail,
    Inflection,
    PendingMeaning,
    PendingTermMedia,
    Register,
    WordClass,
    AdminTermDuplicate,
    AdminTermInput,
    AdminTermListResponse,
    AdminTermSort,
    AdminTermState,
    AppNotification,
    ContributionDetail,
    ContributionInput,
    ContributionListResponse,
    ContributionRejectionReason,
    ContentStatus,
    Game,
    GameMap,
    MapCallout,
    EsportsMatchAdmin,
    EsportsPlayerAdmin,
    EsportsTeamAdmin,
    EsportsSyncRun,
    MatchAdminStatus,
    News,
    NewsStatus,
    PaginatedResponse,
    PaginationQuery,
    NotificationListResponse,
    PrivacyRequest,
    PrivacyRequestStatus,
    PrivacyRequestType,
    Term,
    TermStatus,
    TermSuggestion,
    TeamRankingAdmin,
    TournamentAdmin,
    TermHistoryEntry,
    User
    ,AnalyticsCommunity
    ,AnalyticsDictionary
    ,AnalyticsOverview
    ,AnalyticsQuality
    ,AnalyticsSeo
    ,AnalyticsTraffic
    ,AnalyticsProvider
} from '../../types';
import { isAnalyticsEnabled } from '../lib/analytics';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
});

type RetryableRequestConfig = InternalAxiosRequestConfig & {
    __networkRetryCount?: number;
};

// Add request interceptor to include token.
// Guarded for non-browser environments (build-time prerender loaders run in Node).
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const legacyDashboardToken = localStorage.getItem('dashboard_auth');
        const token = localStorage.getItem('token') || legacyDashboardToken;
        if (!localStorage.getItem('token') && legacyDashboardToken) {
            localStorage.setItem('token', legacyDashboardToken);
            localStorage.removeItem('dashboard_auth');
        }
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        config.headers['X-Analytics-Enabled'] = String(isAnalyticsEnabled());
    }
    return config;
});

// Add response interceptor to handle auth errors
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error.config as RetryableRequestConfig | undefined;
        const isCancelled = error.code === 'ERR_CANCELED' || axios.isCancel(error);
        const isTransientNetworkError = !error.response && !isCancelled;
        const retryCount = config?.__networkRetryCount ?? 0;

        // The local API can briefly be unavailable while nodemon recompiles. Retry
        // reads only; mutations must never be repeated automatically.
        if (config && config.method?.toLowerCase() === 'get' && isTransientNetworkError && retryCount < 2) {
            config.__networkRetryCount = retryCount + 1;
            await new Promise((resolve) => setTimeout(resolve, 400 * (retryCount + 1)));
            return api.request(config);
        }

        if (typeof window !== 'undefined' && error.response && (error.response.status === 401 || error.response.status === 403)) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('dashboard_auth');
            localStorage.removeItem('dashboard_user');
            const isDashboard = window.location.pathname.startsWith('/dashboard');
            const loginPath = isDashboard ? '/dashboard/login' : '/login';
            if (window.location.pathname !== loginPath) {
                window.location.href = loginPath;
            }
        }
        return Promise.reject(error);
    }
);

export const getGames = async () => {
    const response = await api.get('/games');
    return response.data;
};

// ... (existing code)

export const verifyEmail = async (token: string) => {
    const response = await api.post('/auth/verify-email', { token });
    return response.data;
};

export default api;

const normalizePaginatedResponse = <T>(data: PaginatedResponse<T> | T[]): PaginatedResponse<T> => {
    if (!Array.isArray(data)) return data;
    return {
        items: data,
        pagination: {
            page: 1,
            pageSize: data.length || 20,
            total: data.length,
            totalPages: data.length ? 1 : 0,
            hasNext: false,
            hasPrevious: false
        }
    };
};

export interface TermsQuery extends PaginationQuery {
    gameId?: string;
    tag?: string;
    letter?: string;
    sort?: 'relevance' | 'upvotes' | 'createdAt' | 'updatedAt' | 'word';
    origin?: 'home' | 'catalog' | 'game' | 'not_found' | 'unknown';
}

export interface ContributionsQuery extends PaginationQuery {
    status?: TermStatus;
    gameId?: string;
    from?: string;
    to?: string;
    sort?: 'createdAt' | 'updatedAt' | 'word';
}

export interface ModerationDecisionInput {
    action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';
    expectedRevision: number;
    authorMessage?: string;
    internalNote?: string;
    rejectionReason?: ContributionRejectionReason;
}

export interface NewsQuery extends PaginationQuery {
    category?: string;
    sort?: 'createdAt' | 'updatedAt' | 'headline' | 'category';
}

export interface AdminNewsQuery extends PaginationQuery {
    category?: string;
    author?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: NewsStatus;
    sort?: 'createdAt' | 'updatedAt' | 'headline' | 'category' | 'publishedAt' | 'scheduledAt';
}

export interface AdminGamesQuery extends PaginationQuery {
    genre?: string;
    status?: ContentStatus;
    sort?: 'createdAt' | 'updatedAt' | 'name' | 'genre';
}

export interface AdminMapsQuery extends PaginationQuery {
    gameId?: string;
    status?: ContentStatus;
    sort?: 'createdAt' | 'updatedAt' | 'name';
}

export interface AdminTermsQuery extends PaginationQuery {
    gameId?: string;
    tag?: string;
    letter?: string;
    state?: AdminTermState;
    attention?: AdminTermAttention;
    sort?: AdminTermSort;
}

export interface UsersQuery extends PaginationQuery {
    role?: 'ADMIN' | 'USER';
    sort?: 'createdAt' | 'name' | 'email' | 'level';
}

export interface AdminPrivacyQuery extends PaginationQuery {
    status?: PrivacyRequestStatus;
    type?: PrivacyRequestType;
    assignedToId?: string;
    sort?: 'createdAt' | 'updatedAt' | 'dueAt' | 'status' | 'type';
}

export const getGameBySlug = async (slug: string) => {
    const response = await api.get(`/games/${slug}`);
    return response.data;
};

export const getTerms = async (query: TermsQuery = {}): Promise<PaginatedResponse<Term>> => {
    const defaultSort = query.search ? 'relevance' : 'word';
    const sort = query.sort ?? defaultSort;
    const defaultOrder = ['relevance', 'upvotes', 'createdAt', 'updatedAt'].includes(sort) ? 'desc' : 'asc';
    const response = await api.get('/terms', {
        headers: { 'X-Search-Origin': query.origin || 'catalog' },
        params: {
            page: query.page ?? 1,
            pageSize: query.pageSize ?? 24,
            search: query.search || undefined,
            sort,
            order: query.order ?? defaultOrder,
            gameId: query.gameId,
            tag: query.tag,
            letter: query.letter
        }
    });
    return normalizePaginatedResponse<Term>(response.data);
};

export const getTermBySlug = async (slug: string) => {
    const response = await api.get(`/terms/${slug}`);
    return response.data;
};

export const createContribution = async (data: ContributionInput): Promise<ContributionDetail> => {
    const response = await api.post('/contributions', data);
    return response.data;
};

export const getMyContributions = async (query: ContributionsQuery = {}): Promise<ContributionListResponse> => {
    const response = await api.get('/contributions/mine', {
        params: {
            page: query.page ?? 1,
            pageSize: query.pageSize ?? 12,
            status: query.status,
            gameId: query.gameId,
            from: query.from,
            to: query.to,
            sort: query.sort ?? 'createdAt',
            order: query.order ?? 'desc'
        }
    });
    return response.data;
};

export const getContribution = async (id: string): Promise<ContributionDetail> => {
    const response = await api.get(`/contributions/${encodeURIComponent(id)}`);
    return response.data;
};

export const updateContribution = async (
    id: string,
    data: ContributionInput & { expectedRevision: number }
): Promise<ContributionDetail> => {
    const response = await api.patch(`/contributions/${encodeURIComponent(id)}`, data);
    return response.data;
};

export const getAdminContributions = async (query: ContributionsQuery = {}): Promise<ContributionListResponse> => {
    const response = await api.get('/dashboard/contributions', {
        params: {
            page: query.page ?? 1,
            pageSize: query.pageSize ?? 20,
            search: query.search,
            status: query.status,
            gameId: query.gameId,
            sort: query.sort ?? 'createdAt',
            order: query.order ?? 'asc'
        }
    });
    return response.data;
};

export const getAdminContribution = async (id: string): Promise<ContributionDetail> => {
    const response = await api.get(`/dashboard/contributions/${encodeURIComponent(id)}`);
    return response.data;
};

export const decideContribution = async (id: string, decision: ModerationDecisionInput): Promise<ContributionDetail> => {
    const response = await api.post(`/dashboard/contributions/${encodeURIComponent(id)}/decisions`, decision);
    return response.data;
};

export const deleteTerm = async (id: string) => {
    const response = await api.delete(`/terms/${id}`);
    return response.data;
};

export const getAdminTerms = async (query: AdminTermsQuery = {}): Promise<AdminTermListResponse> => {
    const response = await api.get('/dashboard/terms', { params: {
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 20,
        search: query.search || undefined,
        gameId: query.gameId || undefined,
        tag: query.tag || undefined,
        letter: query.letter || undefined,
        state: query.state || 'ACTIVE',
        attention: query.attention || undefined,
        sort: query.sort || 'updatedAt',
        order: query.order || 'desc'
    } });
    return response.data;
};

export const getAdminTerm = async (id: string): Promise<AdminTermDetail> =>
    (await api.get(`/dashboard/terms/${encodeURIComponent(id)}`)).data;

export const createAdminTerm = async (data: AdminTermInput): Promise<AdminTermDetail> =>
    (await api.post('/dashboard/terms', data)).data;

export const updateAdminTerm = async (id: string, data: AdminTermInput & { expectedRevision: number }): Promise<AdminTermDetail> =>
    (await api.put(`/dashboard/terms/${encodeURIComponent(id)}`, data)).data;

/* --- Significados (sentidos) de um termo --- */

export interface MeaningInput {
    definition: string;
    examples: string[];
    gameId: string | null;
    context: string | null;
    wordClass?: WordClass | null;
    inflections?: Inflection[];
    register?: Register | null;
}

export const getPendingMeanings = async (): Promise<PendingMeaning[]> =>
    (await api.get('/dashboard/terms/meanings/pending')).data;

export const moderateMeaning = async (id: string, status: 'APPROVED' | 'REJECTED') =>
    (await api.patch(`/dashboard/terms/meanings/${encodeURIComponent(id)}/status`, { status })).data;

export const createAdminMeaning = async (termId: string, data: MeaningInput) =>
    (await api.post(`/dashboard/terms/${encodeURIComponent(termId)}/meanings`, data)).data;

export const updateAdminMeaning = async (id: string, data: MeaningInput) =>
    (await api.put(`/dashboard/terms/meanings/${encodeURIComponent(id)}`, data)).data;

export const deleteAdminMeaning = async (id: string): Promise<void> => {
    await api.delete(`/dashboard/terms/meanings/${encodeURIComponent(id)}`);
};

export const archiveAdminTerm = async (id: string): Promise<Term> =>
    (await api.post(`/dashboard/terms/${encodeURIComponent(id)}/archive`)).data;

export const restoreAdminTerm = async (id: string): Promise<Term> =>
    (await api.post(`/dashboard/terms/${encodeURIComponent(id)}/restore`)).data;

export const deleteAdminTerm = async (id: string, confirmation: string) =>
    (await api.delete(`/dashboard/terms/${encodeURIComponent(id)}`, { data: { confirmation } })).data;

export const getAdminTermDuplicates = async (word: string, excludeId?: string): Promise<AdminTermDuplicate[]> =>
    (await api.get('/dashboard/terms/duplicates', { params: { word, excludeId } })).data;

export const getAdminTermHistory = async (id: string): Promise<TermHistoryEntry[]> =>
    (await api.get(`/dashboard/terms/${encodeURIComponent(id)}/history`)).data;

export const getNews = async (query: NewsQuery = {}): Promise<PaginatedResponse<News>> => {
    const response = await api.get('/news', {
        params: {
            page: query.page ?? 1,
            pageSize: query.pageSize ?? 20,
            search: query.search || undefined,
            sort: query.sort ?? 'createdAt',
            order: query.order ?? 'desc',
            category: query.category || undefined
        }
    });
    return normalizePaginatedResponse<News>(response.data);
};

export const getNewsById = async (id: string) => {
    const response = await api.get(`/news/${id}`);
    return response.data;
};

export interface NewsInput {
    headline: string;
    slug?: string;
    category: string;
    image?: string;
    content: string;
    author?: string;
    status: NewsStatus;
    publishedAt?: string | null;
    scheduledAt?: string | null;
    seoTitle?: string;
    seoDescription?: string;
    tournamentId?: string | null;
}

export const getAdminNews = async (query: AdminNewsQuery = {}): Promise<PaginatedResponse<News>> => {
    const response = await api.get('/dashboard/news', {
        params: {
            page: query.page ?? 1,
            pageSize: query.pageSize ?? 20,
            search: query.search || undefined,
            sort: query.sort ?? 'createdAt',
            order: query.order ?? 'desc',
            category: query.category || undefined,
            author: query.author || undefined,
            dateFrom: query.dateFrom || undefined,
            dateTo: query.dateTo || undefined,
            status: query.status || undefined
        }
    });
    return normalizePaginatedResponse<News>(response.data);
};

export const createNews = async (data: NewsInput) => {
    const response = await api.post('/news', data);
    return response.data;
};

export const updateNews = async (id: string, data: NewsInput) => {
    const response = await api.put(`/news/${id}`, data);
    return response.data;
};

export const deleteNews = async (id: string) => {
    await api.delete(`/news/${id}`);
};

export const archiveNews = async (id: string) => {
    const response = await api.patch(`/news/${id}/archive`);
    return response.data as News;
};

export const uploadNewsImage = async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.post('/news/upload', formData);
    return response.data as { url: string; mimeType: string; size: number };
};

export interface GameInput {
    name: string;
    slug?: string;
    genre: string;
    image: string;
    description?: string;
    status: ContentStatus;
}

export const getAdminGames = async (query: AdminGamesQuery = {}): Promise<PaginatedResponse<Game>> => {
    const response = await api.get('/dashboard/games', { params: {
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 20,
        search: query.search || undefined,
        sort: query.sort ?? 'createdAt',
        order: query.order ?? 'desc',
        genre: query.genre || undefined,
        status: query.status || undefined
    } });
    return normalizePaginatedResponse<Game>(response.data);
};

export const createGame = async (data: GameInput) => (await api.post('/dashboard/games', data)).data as Game;
export const updateGame = async (id: string, data: GameInput) => (await api.put(`/dashboard/games/${id}`, data)).data as Game;
export const archiveGame = async (id: string) => (await api.patch(`/dashboard/games/${id}/archive`)).data as Game;
export const deleteGame = async (id: string) => { await api.delete(`/dashboard/games/${id}`); };

export interface GameMapInput {
    gameId: string;
    name: string;
    image: string;
    tacticalImage?: string;
    status: ContentStatus;
    callouts: MapCallout[];
}

export const getAdminMaps = async (query: AdminMapsQuery = {}): Promise<PaginatedResponse<GameMap>> => {
    const response = await api.get('/dashboard/maps', { params: {
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 20,
        search: query.search || undefined,
        sort: query.sort ?? 'createdAt',
        order: query.order ?? 'desc',
        gameId: query.gameId || undefined,
        status: query.status || undefined
    } });
    return normalizePaginatedResponse<GameMap>(response.data);
};

export const createMap = async (data: GameMapInput) => (await api.post('/dashboard/maps', data)).data as GameMap;
export const updateMap = async (id: string, data: GameMapInput) => (await api.put(`/dashboard/maps/${id}`, data)).data as GameMap;
export const archiveMap = async (id: string) => (await api.patch(`/dashboard/maps/${id}/archive`)).data as GameMap;
export const deleteMap = async (id: string) => { await api.delete(`/dashboard/maps/${id}`); };

export const uploadAdminImage = async (file: File, folder: 'games' | 'maps') => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.post(`/dashboard/uploads/${folder}`, formData);
    return response.data as { url: string; mimeType: string; size: number };
};

export type TournamentInput = Pick<TournamentAdmin, 'name' | 'gameId' | 'game' | 'status' | 'publicationStatus' | 'teams' | 'standings' | 'bracket' | 'stats'> & {
    slug?: string;
    logo?: string;
    image?: string;
    startAt?: string | null;
    endAt?: string | null;
    prizePool?: string;
    description?: string;
    organizer?: string;
    location?: string;
    format?: string;
};

export interface TournamentsQuery extends PaginationQuery {
    publicationStatus?: ContentStatus;
    gameId?: string;
    status?: string;
    sort?: 'createdAt' | 'updatedAt' | 'name' | 'startAt' | 'endAt';
}

export const getAdminTournaments = async (query: TournamentsQuery = {}): Promise<PaginatedResponse<TournamentAdmin>> => {
    const response = await api.get('/dashboard/tournaments', { params: { page: query.page ?? 1, pageSize: query.pageSize ?? 20, search: query.search || undefined, sort: query.sort ?? 'createdAt', order: query.order ?? 'desc', publicationStatus: query.publicationStatus, gameId: query.gameId, status: query.status } });
    return normalizePaginatedResponse<TournamentAdmin>(response.data);
};
export const createTournament = async (data: TournamentInput) => (await api.post('/dashboard/tournaments', data)).data as TournamentAdmin;
export const updateTournament = async (id: string, data: TournamentInput) => (await api.put(`/dashboard/tournaments/${id}`, data)).data as TournamentAdmin;
export const duplicateTournament = async (id: string) => (await api.post(`/dashboard/tournaments/${id}/duplicate`)).data as TournamentAdmin;
export const archiveTournament = async (id: string) => (await api.patch(`/dashboard/tournaments/${id}/archive`)).data as TournamentAdmin;
export const deleteTournament = async (id: string) => { await api.delete(`/dashboard/tournaments/${id}`); };

export interface TeamInput { name: string; slug?: string; country: string; isBrazilian?: boolean; logo?: string; status: ContentStatus }
export interface PlayerInput { teamId?: string | null; name: string; nickname: string; slug?: string; country: string; role?: string; photo?: string; status: ContentStatus }
export interface MatchInput { gameId: string; tournamentId?: string | null; game: string; competition: string; stage?: string; round?: string; region?: string; isBrazilFocused?: boolean; teamAId: string; teamAName: string; teamACountry: string; teamALogo?: string; teamBId: string; teamBName: string; teamBCountry: string; teamBLogo?: string; scheduledAt: string; bestOf?: number | null; streamUrl?: string; vodUrl?: string; status: MatchAdminStatus; publicationStatus: ContentStatus; scoreA?: number | null; scoreB?: number | null; oddsA?: number | null; oddsB?: number | null }
export interface RankingInput { gameId: string; teamId: string; game: string; teamName: string; teamCountry: string; rank: number; points: number; trend: 'up' | 'down' | 'stable' }

export interface EsportsAdminQuery extends PaginationQuery { status?: string; teamId?: string; gameId?: string; tournamentId?: string; publicationStatus?: ContentStatus }
const adminEsportsList = async <T>(resource: string, query: EsportsAdminQuery = {}) => normalizePaginatedResponse<T>((await api.get(`/dashboard/esports/${resource}`, { params: { page: query.page ?? 1, pageSize: query.pageSize ?? 20, search: query.search || undefined, sort: query.sort, order: query.order, status: query.status, teamId: query.teamId, gameId: query.gameId, tournamentId: query.tournamentId, publicationStatus: query.publicationStatus } })).data);

export const getAdminTeams = (query: EsportsAdminQuery = {}) => adminEsportsList<EsportsTeamAdmin>('teams', query);
export const createEsportsTeam = async (data: TeamInput) => (await api.post('/dashboard/esports/teams', data)).data as EsportsTeamAdmin;
export const updateEsportsTeam = async (id: string, data: TeamInput) => (await api.put(`/dashboard/esports/teams/${id}`, data)).data as EsportsTeamAdmin;
export const archiveEsportsTeam = async (id: string) => (await api.patch(`/dashboard/esports/teams/${id}/archive`)).data as EsportsTeamAdmin;
export const deleteEsportsTeam = async (id: string) => { await api.delete(`/dashboard/esports/teams/${id}`); };

export const getAdminPlayers = (query: EsportsAdminQuery = {}) => adminEsportsList<EsportsPlayerAdmin>('players', query);
export const createEsportsPlayer = async (data: PlayerInput) => (await api.post('/dashboard/esports/players', data)).data as EsportsPlayerAdmin;
export const updateEsportsPlayer = async (id: string, data: PlayerInput) => (await api.put(`/dashboard/esports/players/${id}`, data)).data as EsportsPlayerAdmin;
export const archiveEsportsPlayer = async (id: string) => (await api.patch(`/dashboard/esports/players/${id}/archive`)).data as EsportsPlayerAdmin;
export const deleteEsportsPlayer = async (id: string) => { await api.delete(`/dashboard/esports/players/${id}`); };

export const getAdminMatches = (query: EsportsAdminQuery = {}) => adminEsportsList<EsportsMatchAdmin>('matches', query);
export const createEsportsMatch = async (data: MatchInput) => (await api.post('/dashboard/esports/matches', data)).data as EsportsMatchAdmin;
export const updateEsportsMatch = async (id: string, data: MatchInput) => (await api.put(`/dashboard/esports/matches/${id}`, data)).data as EsportsMatchAdmin;
export const updateEsportsScore = async (id: string, data: { scoreA: number; scoreB: number; status: MatchAdminStatus }) => (await api.patch(`/dashboard/esports/matches/${id}/score`, data)).data as EsportsMatchAdmin;
export const deleteEsportsMatch = async (id: string) => { await api.delete(`/dashboard/esports/matches/${id}`); };

export const getAdminRankings = (query: EsportsAdminQuery = {}) => adminEsportsList<TeamRankingAdmin>('rankings', query);
export const createTeamRanking = async (data: RankingInput) => (await api.post('/dashboard/esports/rankings', data)).data as TeamRankingAdmin;
export const updateTeamRanking = async (id: string, data: RankingInput) => (await api.put(`/dashboard/esports/rankings/${id}`, data)).data as TeamRankingAdmin;
export const deleteTeamRanking = async (id: string) => { await api.delete(`/dashboard/esports/rankings/${id}`); };
export const getEsportsSyncStatus = async () => (await api.get('/dashboard/esports/sync')).data as { configured: boolean; runs: EsportsSyncRun[] };
export const syncEsportsNow = async () => (await api.post('/dashboard/esports/sync')).data as EsportsSyncRun;

export const getComments = async (newsId: string) => {
    const response = await api.get(`/comments/${newsId}`);
    return response.data;
};

export const createComment = async (newsId: string, content: string) => {
    const response = await api.post('/comments', { newsId, content });
    return response.data;
};


export const getDashboardStats = async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
};

export const getDashboardCharts = async () => {
    const response = await api.get('/dashboard/charts');
    return response.data;
};

export const getUsers = async (query: UsersQuery = {}): Promise<PaginatedResponse<User>> => {
    const response = await api.get('/dashboard/users', {
        params: {
            page: query.page ?? 1,
            pageSize: query.pageSize ?? 20,
            search: query.search || undefined,
            sort: query.sort ?? 'createdAt',
            order: query.order ?? 'desc',
            role: query.role
        }
    });
    return normalizePaginatedResponse<User>(response.data);
};

export const login = async (credentials: any) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
};

export const registerUser = async (userData: any) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
};

export const updateTerm = async (id: string, data: any) => {
    const response = await api.put(`/terms/${id}`, data);
    return response.data;
};

export const recordTermView = async (id: string, data: { source?: string; searchToken?: string | null; position?: number } = {}) => {
    const response = await api.post(`/terms/${id}/view`, data);
    return response.data;
};

export const getTrendingTerms = async () => {
    const response = await api.get('/terms/trending/now');
    return response.data;
};

export const getTermOfTheDay = async () => {
    const response = await api.get('/terms/term-of-the-day');
    return response.data;
};

export const voteMeaning = async (meaningId: string, type: 'up' | 'down') => {
    const response = await api.post(`/terms/meanings/${meaningId}/vote`, { type });
    return response.data as { upvotes: number; downvotes: number; score: number; myVote: number };
};

/** The user's votes across a term's senses: { [meaningId]: 1 | -1 }. */
export const getMyMeaningVotes = async (termId: string) => {
    const response = await api.get(`/terms/${termId}/my-votes`);
    return (response.data?.votes || {}) as Record<string, number>;
};

/* --- Origem & imagens: contribuição pública + curadoria pelo dono --- */

export const proposeOrigin = async (termId: string, content: string) =>
  (await api.post(`/terms/${termId}/origin`, { content })).data as { id: string; status: string };

export const setTermOriginHidden = async (termId: string, hidden: boolean) =>
  (await api.post(`/terms/${termId}/origin-hidden`, { hidden })).data;

export const uploadTermImage = async (termId: string, file: File, caption?: string) => {
  const form = new FormData();
  form.append('image', file);
  if (caption) form.append('caption', caption);
  return (await api.post(`/terms/${termId}/images`, form, { headers: { 'Content-Type': 'multipart/form-data' } })).data as { id: string; status: string };
};

/** Curation view for one term: can the viewer curate it, and what awaits them. */
export const getTermCuration = async (termId: string) =>
  (await api.get(`/terms/${termId}/curation`)).data as { canCurate: boolean; pending: PendingTermMedia[] };

/** Media awaiting the signed-in user's curation (their terms). */
export const getMyPendingMedia = async () =>
  (await api.get('/terms/media/pending/mine')).data as PendingTermMedia[];

export const acceptTermMedia = async (mediaId: string) =>
  (await api.post(`/terms/media/${mediaId}/accept`)).data;

/** Report a published image/origin. Works logged in or not. */
export const reportTermMedia = async (mediaId: string, reason: string, details?: string) =>
  (await api.post(`/terms/media/${mediaId}/report`, { reason, details })).data;

export const declineTermMedia = async (mediaId: string) =>
  (await api.post(`/terms/media/${mediaId}/decline`)).data;

/** Admin media queue (includes SafeSearch-flagged items). */
export const getAdminPendingMedia = async () =>
  (await api.get('/dashboard/terms/media/pending')).data as PendingTermMedia[];

/** Propose a new sense for an existing word. Lands as PENDING for moderation. */
export const proposeTermMeaning = async (termId: string, payload: MeaningInput) => {
  const response = await api.post(`/terms/${termId}/meanings`, payload);
  return response.data as { id: string; status: string };
};

export const reportTerm = async (id: string, reason: string, details?: string) => {
    const response = await api.post(`/terms/${id}/report`, { reason, details });
    return response.data;
};

export const getReports = async (status?: string, termId?: string) => {
    const response = await api.get('/dashboard/reports', { params: { status: status || undefined, termId: termId || undefined } });
    return response.data;
};

export const updateReportStatus = async (id: string, status: string) => {
    const response = await api.patch(`/dashboard/reports/${id}`, { status });
    return response.data;
};

export const getMaps = async (gameId: string) => {
    const response = await api.get(`/maps/${gameId}`);
    return response.data;
};

export const getUserProfile = async () => {
    const response = await api.get('/users/me');
    return response.data;
};

export const getUserActivity = async () => {
    const response = await api.get('/users/me/activity');
    return response.data;
};

export const getNotifications = async (query: { page?: number; pageSize?: number; unreadOnly?: boolean } = {}): Promise<NotificationListResponse> => {
    const response = await api.get('/users/me/notifications', {
        params: {
            page: query.page ?? 1,
            pageSize: query.pageSize ?? 20,
            unreadOnly: query.unreadOnly || undefined
        }
    });
    return response.data;
};

export const getUnreadNotificationCount = async (): Promise<number> => {
    const response = await api.get('/users/me/notifications/unread-count');
    return response.data.count;
};

export const markNotificationRead = async (id: string): Promise<AppNotification> => {
    const response = await api.patch(`/users/me/notifications/${encodeURIComponent(id)}/read`);
    return response.data;
};

export const markNotificationClicked = async (id: string): Promise<AppNotification> => {
    const response = await api.patch(`/users/me/notifications/${encodeURIComponent(id)}/clicked`);
    return response.data;
};

export interface AnalyticsQuery { from?: string; to?: string; compare?: 'previous'; }
const analyticsParams = (query: AnalyticsQuery) => ({ ...query, compare: query.compare || 'previous' });
export const getAnalyticsOverview = async (query: AnalyticsQuery): Promise<AnalyticsOverview> => (await api.get('/dashboard/analytics/overview', { params: analyticsParams(query) })).data;
export const getAnalyticsTraffic = async (query: AnalyticsQuery): Promise<AnalyticsTraffic> => (await api.get('/dashboard/analytics/traffic', { params: analyticsParams(query) })).data;
export const getAnalyticsSeo = async (query: AnalyticsQuery): Promise<AnalyticsSeo> => (await api.get('/dashboard/analytics/seo', { params: analyticsParams(query) })).data;
export const getAnalyticsDictionary = async (query: AnalyticsQuery): Promise<AnalyticsDictionary> => (await api.get('/dashboard/analytics/dictionary', { params: analyticsParams(query) })).data;
export const getAnalyticsCommunity = async (query: AnalyticsQuery): Promise<AnalyticsCommunity> => (await api.get('/dashboard/analytics/community', { params: analyticsParams(query) })).data;
export const getAnalyticsQuality = async (query: AnalyticsQuery): Promise<AnalyticsQuality> => (await api.get('/dashboard/analytics/quality', { params: analyticsParams(query) })).data;
export const syncAnalytics = async (provider?: AnalyticsProvider) => (await api.post('/dashboard/analytics/sync', { provider: provider || 'ALL' })).data;
export const downloadAnalyticsCsv = async (section: string, query: AnalyticsQuery) => {
    const response = await api.get('/dashboard/analytics/export.csv', { params: { section, ...query }, responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `analytics-${section}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
};

export const markAllNotificationsRead = async (): Promise<number> => {
    const response = await api.patch('/users/me/notifications/read-all');
    return response.data.updated;
};

export const updateUserProfile = async (data: any) => {
    const response = await api.put('/users/me', data);
    return response.data;
};


export const updatePassword = async (currentPassword: string, newPassword: string) => {
    const response = await api.put('/users/me/password', { currentPassword, newPassword });
    return response.data;
};

export const getMyPrivacyRequests = async (): Promise<PrivacyRequest[]> => {
    const response = await api.get('/users/me/privacy-requests');
    return response.data;
};

export const exportMyData = async (): Promise<{ blob: Blob; filename: string }> => {
    const response = await api.post('/users/me/export', undefined, { responseType: 'blob' });
    const disposition = response.headers['content-disposition'] as string | undefined;
    const filename = disposition?.match(/filename="?([^";]+)"?/i)?.[1] || `dicionario-gamer-dados-${new Date().toISOString().slice(0, 10)}.json`;
    return { blob: response.data, filename };
};

export const createPrivacyRequest = async (data: { type: Exclude<PrivacyRequestType, 'EXPORT'>; password: string; requestNote?: string }) => {
    const response = await api.post('/users/me/privacy-requests', data);
    return response.data as { request: PrivacyRequest; emailSent: boolean };
};

export const confirmPrivacyRequest = async (token: string): Promise<PrivacyRequest> => {
    const response = await api.post('/users/privacy-requests/confirm', { token });
    return response.data;
};

export const resendPrivacyConfirmation = async (id: string) => {
    const response = await api.post(`/users/me/privacy-requests/${id}/resend`);
    return response.data as { message: string; emailSent: boolean };
};

export const cancelPrivacyRequest = async (id: string): Promise<PrivacyRequest> => {
    const response = await api.post(`/users/me/privacy-requests/${id}/cancel`);
    return response.data;
};

export const getAdminPrivacyRequests = async (query: AdminPrivacyQuery = {}): Promise<PaginatedResponse<PrivacyRequest>> => {
    const response = await api.get('/dashboard/privacy-requests', { params: {
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 20,
        search: query.search || undefined,
        sort: query.sort ?? 'dueAt',
        order: query.order ?? 'asc',
        status: query.status || undefined,
        type: query.type || undefined,
        assignedToId: query.assignedToId || undefined
    } });
    return normalizePaginatedResponse<PrivacyRequest>(response.data);
};

export const getAdminPrivacyRequest = async (id: string): Promise<PrivacyRequest> => {
    const response = await api.get(`/dashboard/privacy-requests/${id}`);
    return response.data;
};

export const updateAdminPrivacyRequest = async (id: string, data: { status?: PrivacyRequestStatus; assignedToId?: string | null; resolutionNote?: string }) => {
    const response = await api.patch(`/dashboard/privacy-requests/${id}`, data);
    return response.data as PrivacyRequest;
};

export const completeAdminPrivacyRequest = async (id: string, resolutionNote: string) => {
    const response = await api.post(`/dashboard/privacy-requests/${id}/complete`, { resolutionNote });
    return response.data as PrivacyRequest;
};
export const forgotPassword = async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
};

export const resendVerificationEmail = async (email: string) => {
    const response = await api.post('/auth/resend-verification', { email });
    return response.data;
};

export const resetPassword = async (token: string, newPassword: string) => {
    const response = await api.post('/auth/reset-password', { token, newPassword });
    return response.data;
};

export const searchTerms = async (query: string): Promise<TermSuggestion[]> => {
    const response = await api.get(`/terms/search?q=${encodeURIComponent(query)}`);
    return response.data;
};

export const getCatalogMeta = async (): Promise<CatalogMeta> => {
    const response = await api.get('/terms/catalog-meta');
    return response.data;
};

export const getLeaderboard = async (): Promise<LeaderboardEntry[]> => {
    const response = await api.get('/users/leaderboard');
    return response.data;
};

/** Public contributor profile by id. Returns null on 404 (anonymized/removed). */
export const getPublicProfile = async (id: string): Promise<PublicProfile | null> => {
    try {
        const response = await api.get(`/users/${encodeURIComponent(id)}`);
        return response.data;
    } catch (error: any) {
        if (error?.response?.status === 404) return null;
        throw error;
    }
};

export const subscribeNewsletter = async (email: string, consent: boolean, source = 'home') => {
    const response = await api.post('/newsletter/subscribe', { email, consent, source });
    return response.data;
};

// AI Services (server-side Gemini proxy)
export const validateContribution = async (word: string, definition: string) => {
    const response = await api.post('/ai/validate-contribution', { word, definition });
    return response.data;
};


export enum GameGenre {
  FPS = 'FPS',
  MOBA = 'MOBA',
  RPG = 'RPG',
  RTS = 'RTS',
  Fighting = 'Fighting',
  BattleRoyale = 'Battle Royale',
  MMORPG = 'MMORPG',
  Sports = 'Sports',
  Sandbox = 'Sandbox',
  Survival = 'Survival',
  General = 'Geral'
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
  analytics?: { searchToken?: string | null };
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export type PrivacyRequestType = 'EXPORT' | 'DELETE' | 'CORRECTION' | 'ANONYMIZATION';
export type PrivacyRequestStatus = 'REQUESTED' | 'CONFIRMED' | 'IN_REVIEW' | 'PROCESSING' | 'COMPLETED' | 'REJECTED' | 'CANCELED';

export interface PrivacyRequestActor {
  id: string;
  name: string;
  email?: string;
  role?: string;
  anonymizedAt?: string | null;
}

export interface PrivacyRequestEvent {
  id: string;
  eventType: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  actor?: PrivacyRequestActor | null;
}

export interface PrivacyRequest {
  id: string;
  protocol: string;
  type: PrivacyRequestType;
  status: PrivacyRequestStatus;
  requesterEmail?: string;
  requestNote?: string | null;
  confirmedAt?: string | null;
  dueAt: string;
  assignedToId?: string | null;
  assignedTo?: PrivacyRequestActor | null;
  user?: PrivacyRequestActor | null;
  resolutionNote?: string | null;
  completedAt?: string | null;
  canceledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  events?: PrivacyRequestEvent[];
}

export interface Game {
  id: string;
  name: string;
  slug: string;
  image: string;
  genre: GameGenre;
  description?: string | null;
  status?: ContentStatus;
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    terms: number;
    maps: number;
    favoritedBy: number;
  };
}

export type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type NewsStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';

export interface MapCallout {
  id?: string;
  name: string;
  description?: string | null;
  x: number;
  y: number;
  type: 'Site' | 'Spawn' | 'Callout' | 'Objective' | 'Item';
}

export interface GameMap {
  id: string;
  gameId: string;
  game?: Pick<Game, 'id' | 'name' | 'slug'>;
  name: string;
  image: string;
  tacticalImage?: string | null;
  status: ContentStatus;
  archivedAt?: string | null;
  callouts: MapCallout[];
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id?: string | null;
  name: string;
  country: string; // ISO code for flag
  logo?: string | null;
}

export interface Match {
  id: string;
  externalId?: string | null;
  provider?: 'MANUAL' | 'LIQUIPEDIA';
  sourceUrl?: string | null;
  gameId?: string | null;
  game: string;
  tournamentId?: string | null;
  tournamentSlug?: string | null;
  competition: string;
  stage?: string | null;
  round?: string | null;
  region?: string;
  isBrazilFocused?: boolean;
  teamA: Team;
  teamB: Team;
  time: string;
  date: string;
  scheduledAt?: string | null;
  isLive?: boolean;
  scoreA?: number | null;
  scoreB?: number | null;
  bestOf?: number | null;
  number_of_games?: number;
  stream?: string | null;
  streamUrl?: string | null;
  vodUrl?: string | null;
  oddsA?: number;
  oddsB?: number;
  status: MatchAdminStatus;
  lastSyncedAt?: string | null;
}

export interface Tournament {
  id: string;
  slug?: string;
  gameId?: string | null;
  name: string;
  game: string;
  logo?: string; // URL or placeholder
  status: 'Live' | 'Upcoming' | 'Playoffs' | 'Group Stage' | 'Finished';
  dates: string;
  prizePool: string;
  image?: string;
  publicationStatus?: ContentStatus;
  startAt?: string | null;
  endAt?: string | null;
  archivedAt?: string | null;
  provider?: 'MANUAL' | 'LIQUIPEDIA';
  sourceUrl?: string | null;
  region?: string;
  country?: string;
  isBrazilFocused?: boolean;
  lastSyncedAt?: string | null;
}

export interface StandingRow {
  rank: number;
  team: Team;
  played: number;
  wins: number;
  losses: number;
  points: number;
  diff: number; // Round difference or similar
  streak: string;
}

export interface BracketMatch {
  id: string;
  round: string; // e.g. "Quarterfinals", "Semifinals", "Lower Final", "Grand Final"
  teamA: { name: string; score: number | null; isWinner?: boolean };
  teamB: { name: string; score: number | null; isWinner?: boolean };
  date?: string;
  status?: 'Scheduled' | 'Live' | 'Finished' | string;
}

export interface TournamentDetail extends Tournament {
  description: string;
  organizer: string;
  location: string;
  format: string; // e.g. "Double Elimination", "Bo3"
  teams: Team[];
  standings?: StandingRow[];
  bracket?: BracketMatch[];
  matches?: Match[];
  news?: EsportsNews[];
  stats?: PlayerStat[];
  attribution?: EsportsAttribution | null;
}

export interface EsportsAttribution { provider: string; license: string; url: string }
export interface EsportsSource {
  attribution: EsportsAttribution;
  configured: boolean;
  focus: { countries: string[]; keywords: string[]; teams: string[] };
  latestSync?: { status: string; finishedAt?: string | null; accepted: number; matchesUpserted: number; error?: string | null } | null;
}
export interface EsportsOverview { matches: Match[]; results: Match[]; tournaments: Tournament[]; rankings: TeamRanking[]; news: EsportsNews[]; source: EsportsSource }

export type TermStatus = 'PENDING' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED';
export type TermModerationEventType = 'SUBMITTED' | 'AUTHOR_UPDATED' | 'CHANGES_REQUESTED' | 'RESUBMITTED' | 'APPROVED' | 'REJECTED' | 'MIGRATED';
export type ContributionRejectionReason = 'DUPLICATE' | 'INACCURATE' | 'OUT_OF_SCOPE' | 'INSUFFICIENT_DETAIL' | 'INAPPROPRIATE' | 'SPAM' | 'OTHER';
export type NotificationType = 'CONTRIBUTION_APPROVED' | 'CONTRIBUTION_REJECTED' | 'CONTRIBUTION_CHANGES_REQUESTED';
export type NotificationEmailStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';

export interface ContributorRef {
  id: string;
  name: string;
  email?: string;
  avatar?: string | null;
  level?: number;
  role?: string;
}

/** Grammatical class of a sense. A word can shift class between senses. */
export type WordClass = 'SUBSTANTIVO' | 'VERBO' | 'ADJETIVO' | 'ADVERBIO' | 'INTERJEICAO' | 'EXPRESSAO';

/** Tone of a sense, escalating. The last two carry a usage warning. */
export type Register = 'NEUTRO' | 'INFORMAL' | 'IRONICO' | 'PEJORATIVO' | 'OFENSIVO';


/** A labelled inflected form, e.g. { label: 'particípio', form: 'gankado' }. */
export interface Inflection {
  label: string;
  form: string;
}

/** One numbered sense of a word. Ranked by score; authorship is shown per sense. */
export interface TermMeaning {
  id: string;
  definition: string;
  examples: string[];
  context?: string | null;
  wordClass?: WordClass | null;
  inflections?: Inflection[];
  register?: Register | null;
  game?: Pick<Game, 'id' | 'name' | 'slug'> | null;
  order: number;
  upvotes: number;
  downvotes: number;
  score: number;
  author?: ContributorRef | null;
  createdAt?: string;
}

/** An approved image attached to a term (screenshot, clip frame, map spot). */
export interface TermImage {
  id: string;
  url: string;
  content?: string | null; // caption
  author?: { id: string; name: string; avatar?: string | null } | null;
}

/** A pending origin/image contribution awaiting the term owner's curation. */
export interface PendingTermMedia {
  id: string;
  kind: 'ORIGIN' | 'IMAGE';
  content?: string | null;
  url?: string | null;
  flagged: boolean;
  flagReason?: string | null;
  createdAt: string;
  term: { id: string; word: string };
  author?: ContributorRef | null;
  /** Pending reports against an already-published item (admin queue only). */
  reports?: Array<{ id: string; reason: string; details?: string | null; createdAt: string }>;
}

export interface Term {
  id: string;
  word: string;
  /** Legacy top-level definition: mirrors the leading meaning. Prefer `meanings`. */
  definition: string;
  meanings?: TermMeaning[];
  phonetic?: string | null;
  pronunciationGuide?: string | null;
  examples: string[];
  relatedTerms?: string[];
  upvotes: number;
  downvotes: number;
  tags: string[];
  aliases?: string[];
  keywords?: string[];
  author?: string | ContributorRef | null;
  authorId?: string;
  status: TermStatus;
  revision: number;
  moderatedAt?: string | null;
  archivedAt?: string | null;
  origin?: string | null;
  originHidden?: boolean;
  images?: TermImage[] | null;
  gameId?: string | null;
  game?: Game | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TermSuggestion {
  id: string;
  word: string;
  definition: string;
  tags: string[];
  game: Pick<Game, 'id' | 'name' | 'slug'> | null;
}

export interface CatalogMeta {
  total: number;
  contributors: number;
  games: Array<Pick<Game, 'id' | 'name' | 'slug'> & { count: number }>;
  tags: Array<{ name: string; count: number }>;
  letters: Array<{ letter: string; count: number }>;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatar?: string | null;
  level: number;
  terms: number;
}

/** Public contributor profile: identity plus the terms they authored. */
export interface PublicProfile {
  id: string;
  name: string;
  avatar?: string | null;
  level: number;
  description?: string | null;
  createdAt: string;
  favoriteGame?: Pick<Game, 'id' | 'name' | 'slug' | 'image'> | null;
  terms: Term[];
  termsCount: number;
  commentsCount: number;
  badges: EarnedBadge[];
}

/** A badge a user has unlocked. The visual catalog lives in components/badges.ts. */
export interface EarnedBadge {
  badgeId: string;
  earnedAt: string;
}

export interface ContributionInput {
  word: string;
  definition: string;
  gameId?: string | null;
  examples: string[];
  tags: string[];
  /** Linguistic layer, carried into the term's first sense. All optional. */
  wordClass?: WordClass | null;
  register?: Register | null;
  inflections?: Inflection[];
}

export interface BotProtectionStatus {
  enabled: boolean;
  challengeRequired: boolean;
  reason: 'DISABLED' | 'RECENTLY_VERIFIED' | 'NEW_ACCOUNT' | 'ACCELERATED_ACTIVITY' | 'DAILY_ACTIVITY' | 'NOT_REQUIRED';
  trustExpiresAt?: string | null;
}

export interface TermModerationEvent {
  id: string;
  type: TermModerationEventType;
  fromStatus?: TermStatus | null;
  toStatus: TermStatus;
  revision: number;
  authorMessage?: string | null;
  internalNote?: string | null;
  rejectionReason?: ContributionRejectionReason | null;
  snapshot?: Partial<ContributionInput> | null;
  actor?: ContributorRef | null;
  createdAt: string;
}

export interface ContributionSummary extends Term {
  moderationEvents: TermModerationEvent[];
}

export interface ContributionDetail extends Term {
  moderationEvents: TermModerationEvent[];
}

export interface ContributionListResponse extends PaginatedResponse<ContributionSummary> {
  counts?: Record<TermStatus, number>;
}

export type AdminTermState = 'ACTIVE' | 'ARCHIVED';
export type AdminTermAttention = 'ANY' | 'REPORTED' | 'MISSING_TAGS' | 'MISSING_EXAMPLES';
export type AdminTermSort = 'word' | 'views28d' | 'upvotes' | 'pendingReports' | 'createdAt' | 'updatedAt';

export interface AdminTermQuality {
  missingTags: boolean;
  missingExamples: boolean;
  reported: boolean;
  needsAttention: boolean;
}

export interface AdminTermRow {
  id: string;
  word: string;
  definition: string;
  game: Pick<Game, 'id' | 'name' | 'slug'> | null;
  tags: string[];
  examples: string[];
  revision: number;
  archivedAt: string | null;
  upvotes: number;
  downvotes: number;
  voteBalance: number;
  viewsTotal: number;
  views28d: number;
  pendingReports: number;
  quality: AdminTermQuality;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTermSummary {
  active: number;
  archived: number;
  views28d: number;
  pendingReports: number;
  needsAttention: number;
}

export interface AdminTermInput {
  word: string;
  definition: string;
  gameId: string | null;
  tags: string[];
  examples: string[];
  phonetic: string | null;
  pronunciationGuide: string | null;
  relatedTerms: string[];
  aliases: string[];
}

/** A community-proposed sense awaiting moderation. */
export interface PendingMeaning {
  id: string;
  definition: string;
  examples: string[];
  context?: string | null;
  status: string;
  createdAt: string;
  term: { id: string; word: string };
  game?: Pick<Game, 'id' | 'name'> | null;
  author?: ContributorRef | null;
}

/** A sense as returned to the dashboard, including non-approved ones. */
export interface AdminTermMeaning extends TermMeaning {
  status: string;
}

export interface AdminTermDetail extends Term {
  meanings?: AdminTermMeaning[];
  metrics: { viewsTotal: number; views28d: number; pendingReports: number; voteBalance: number };
  quality: AdminTermQuality;
  reports: Array<{ id: string; reason: string; details?: string | null; status: string; createdAt: string }>;
}

export interface AdminTermListResponse extends PaginatedResponse<AdminTermRow> {
  summary: AdminTermSummary;
}

export interface AdminTermDuplicate {
  id: string;
  word: string;
  game: Pick<Game, 'id' | 'name'> | null;
  score: number;
  exact: boolean;
}

export interface TermHistoryEntry {
  id: string;
  source: 'MODERATION' | 'EDITORIAL';
  action?: string;
  type?: TermModerationEventType;
  actor?: ContributorRef | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  authorMessage?: string | null;
  internalNote?: string | null;
  rejectionReason?: ContributionRejectionReason | null;
  revision?: number;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  termId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  data?: Record<string, unknown> | null;
  readAt?: string | null;
  clickedAt?: string | null;
  emailStatus: NotificationEmailStatus;
  emailSentAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AnalyticsProvider = 'PLAUSIBLE' | 'SEARCH_CONSOLE' | 'SENTRY' | 'CRUX' | 'PAGESPEED';
export type AnalyticsProviderState = 'READY' | 'STALE' | 'NOT_CONFIGURED' | 'ERROR';

export interface MetricValue {
  value: number;
  previous: number;
  deltaPercent: number;
}

export interface ProviderFreshness {
  provider: AnalyticsProvider;
  configured: boolean;
  state: AnalyticsProviderState;
  lastSyncedAt?: string | null;
  lastStatus?: string | null;
  message?: string | null;
  dashboardUrl?: string | null;
}

export interface AnalyticsOverview {
  generatedAt: string;
  coreMetrics: {
    organicVisitors: MetricValue;
    searchSuccessRate: MetricValue;
    organicReturnRate: MetricValue;
    signupConversionRate: MetricValue;
    contributions: MetricValue;
    medianModerationHours: MetricValue;
  };
  attention: Array<{
    id: string;
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    title: string;
    value: string;
    description: string;
    action: { kind: 'TAB' | 'ROUTE'; target: string; label: string };
  }>;
  productTrend: Array<{ date: string; organicVisitors: number; searches: number; termsOpened: number }>;
  funnel: Array<{
    key: string;
    label: string;
    value: number;
    conversionRate: number;
    abandonment: number;
    abandonmentRate: number;
  }>;
  rankings: {
    terms: Array<{ id: string; word: string; game?: string | null; views: number }>;
    zeroResults: Array<{ query: string; count: number; previousCount: number; deltaPercent: number }>;
    pages: Array<{ key: string; clicks: number; impressions: number; ctr: number; position: number; previousClicks: number; changePercent: number }>;
  };
  communitySummary: {
    pending: number;
    approved: number;
    rejected: number;
    changesRequested: number;
    approvalRate: number;
    medianDecisionHours: number;
  };
  providers: ProviderFreshness[];
  metrics: Record<string, MetricValue>;
  activeUsers: { today: number; days7: number; days30: number };
  funnels: {
    anonymous: { organicVisits: number; searches: number; results: number; termsOpened: number; signups: number; contributions: number };
  };
  returning: {
    newVisits: number;
    returningVisits: number;
    organicVisits: number;
    organicReturningVisits: number;
    estimatedByBrowser: boolean;
  };
  series: {
    traffic: Array<{ date: string; visitors: number; visits: number; pageviews: number }>;
    searches: Array<{ date: string; value: number }>;
    signups: Array<{ date: string; value: number }>;
  };
}

export interface AnalyticsBreakdownRow {
  key: string;
  visitors?: number;
  visits?: number;
  pageviews?: number;
  bounceRate?: number;
  visitDurationSec?: number;
  value?: number;
}

export interface AnalyticsTraffic {
  daily: Array<{ date: string; visitors: number; visits: number; pageviews: number }>;
  channels: AnalyticsBreakdownRow[];
  sources: AnalyticsBreakdownRow[];
  referrers: AnalyticsBreakdownRow[];
  landingPages: AnalyticsBreakdownRow[];
  exitPages: AnalyticsBreakdownRow[];
  pages: AnalyticsBreakdownRow[];
  countries: AnalyticsBreakdownRow[];
  devices: AnalyticsBreakdownRow[];
  browsers: AnalyticsBreakdownRow[];
  operatingSystems: AnalyticsBreakdownRow[];
  campaigns: AnalyticsBreakdownRow[];
}

export interface SeoMetricRow {
  key: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  previousClicks?: number;
  changePercent?: number;
}

export interface AnalyticsSeo {
  daily: Array<{ date: string; clicks: number; impressions: number; ctr: number; position: number }>;
  totals: { clicks: number; impressions: number; ctr: number; position: number };
  queries: SeoMetricRow[];
  pages: SeoMetricRow[];
  devices: SeoMetricRow[];
  countries: SeoMetricRow[];
  pageChanges: SeoMetricRow[];
  opportunities: SeoMetricRow[];
  inspections: Array<{ id: string; url: string; verdict: string; coverageState?: string | null; inspectedAt: string }>;
}

export interface AnalyticsDictionary {
  totals: { searches: number; resultRate: number; successRate: number; votes: number; reports: number };
  topQueries: Array<{ query: string; count: number; averageResults: number }>;
  zeroResults: Array<{ query: string; count: number; averageResults: number }>;
  origins: Array<{ key: string; value: number }>;
  terms: Array<{ id: string; word: string; game?: string | null; views: number }>;
  games: Array<{ id?: string | null; name: string; searches: number }>;
  filters: Array<{ key: string; value: number }>;
  events: AnalyticsBreakdownRow[];
}

export interface AnalyticsCommunity {
  statuses: Record<string, number>;
  contributors: number;
  approvalRate: number;
  moderation: { medianHours: number; p95Hours: number; averageRevisions: number; decisions: number };
  rejectionReasons: Array<{ key: string; value: number }>;
  topContributors: Array<{ id?: string | null; name: string; contributions: number }>;
  engagement: { newsComments: number; notifications: number; notificationsRead: number; notificationsClicked: number; favoriteGameProfiles: number };
  retention: { cohort: number; d7: number; d30: number };
  funnel: { accounts: number; firstContribution: number; decisions: number; retainedD7: number; retainedD30: number };
}

export interface TechnicalMetricSnapshot {
  id: string;
  provider: AnalyticsProvider;
  date: string;
  kind: string;
  key: string;
  device: string;
  value: number;
  unit?: string | null;
  metadata?: Record<string, unknown> | null;
  updatedAt: string;
}

export interface AnalyticsQuality { snapshots: TechnicalMetricSnapshot[]; latest: TechnicalMetricSnapshot[]; }

export interface NotificationListResponse extends PaginatedResponse<AppNotification> {
  unreadCount: number;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  emailVerified?: boolean;
  avatar: string;
  level: number;
  preferences?: string | Record<string, unknown>;
  description?: string | null;
  badges?: EarnedBadge[];
  role?: string;
  token?: string;
  createdAt?: string;
  _count?: {
    terms: number;
    comments: number;
  };
  favoriteGame?: {
    id: string;
    name: string;
    slug?: string;
    image: string;
  };
}

export interface Comment {
  id: string;
  content: string;
  newsId: string;
  userId: string;
  user?: User;
  likes: number;
  createdAt: string;
}

export interface News {
  id: string;
  headline: string;
  slug: string;
  category: string;
  image?: string;
  content?: string;
  author?: string;
  status: NewsStatus;
  publishedAt?: string | null;
  scheduledAt?: string | null;
  archivedAt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  createdById?: string | null;
  createdBy?: Pick<User, 'id' | 'name' | 'email'> | null;
  tournamentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EsportsNews {
  id: string;
  headline: string;
  slug?: string;
  category: string;
  timeAgo: string;
  image?: string;
  author?: string;
}

export interface TeamRanking {
  id?: string;
  rank: number;
  team: Team;
  points: number;
  trend: 'up' | 'down' | 'stable';
  game: string;
}

export type MatchAdminStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELED';

export interface EsportsTeamAdmin {
  id: string;
  name: string;
  slug: string;
  country: string;
  logo?: string | null;
  status: ContentStatus;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: Record<string, number>;
}

export interface EsportsPlayerAdmin {
  id: string;
  teamId?: string | null;
  team?: Pick<EsportsTeamAdmin, 'id' | 'name' | 'slug'> | null;
  name: string;
  nickname: string;
  slug: string;
  country: string;
  role?: string | null;
  photo?: string | null;
  status: ContentStatus;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { stats: number };
}

export interface TournamentTeamAdmin {
  id?: string;
  teamId?: string | null;
  name: string;
  country: string;
}

export interface TournamentStandingAdmin {
  id?: string;
  teamId?: string | null;
  rank: number;
  teamName: string;
  teamCountry: string;
  teamLogo?: string | null;
  played: number;
  wins: number;
  losses: number;
  points: number;
  diff: number;
  streak?: string | null;
}

export interface TournamentBracketAdmin {
  id?: string;
  matchKey: string;
  round: string;
  teamAId?: string | null;
  teamAName: string;
  teamAScore?: number | null;
  teamAWinner: boolean;
  teamBId?: string | null;
  teamBName: string;
  teamBScore?: number | null;
  teamBWinner: boolean;
  date?: string | null;
  status: string;
}

export interface TournamentPlayerStatAdmin {
  id?: string;
  playerId?: string | null;
  name: string;
  team: string;
  country: string;
  role?: string | null;
  photo?: string | null;
  stats: Record<string, string | number>;
}

export interface TournamentAdmin extends Tournament {
  game: string;
  logo?: string | null;
  status: 'Live' | 'Upcoming' | 'Playoffs' | 'Group Stage' | 'Finished';
  publicationStatus: ContentStatus;
  description?: string | null;
  organizer?: string | null;
  location?: string | null;
  format?: string | null;
  teams: TournamentTeamAdmin[];
  standings: TournamentStandingAdmin[];
  bracket: TournamentBracketAdmin[];
  stats: TournamentPlayerStatAdmin[];
  _count?: { matches: number };
  createdAt: string;
  updatedAt: string;
}

export interface EsportsMatchAdmin {
  id: string;
  gameId: string;
  tournamentId?: string | null;
  game: string;
  competition: string;
  provider?: 'MANUAL' | 'LIQUIPEDIA';
  stage?: string | null;
  round?: string | null;
  region?: string;
  isBrazilFocused?: boolean;
  teamAId: string;
  teamAName: string;
  teamACountry: string;
  teamALogo?: string | null;
  teamBId: string;
  teamBName: string;
  teamBCountry: string;
  teamBLogo?: string | null;
  scheduledAt: string;
  bestOf?: number | null;
  streamUrl?: string | null;
  vodUrl?: string | null;
  status: MatchAdminStatus;
  publicationStatus: ContentStatus;
  scoreA?: number | null;
  scoreB?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamRankingAdmin {
  id: string;
  gameId: string;
  teamId: string;
  game: string;
  teamName: string;
  teamCountry: string;
  rank: number;
  points: number;
  trend: 'up' | 'down' | 'stable';
  createdAt: string;
  updatedAt: string;
}

export interface PlayerStat {
  id: string;
  name: string;
  team: string;
  country: string;
  photo?: string;
  role?: string;
  // Dynamic stats key-value pairs
  stats: Record<string, string | number>;
}

export interface StatColumnDef {
  key: string;
  label: string;
  primary?: boolean; // Highlighted column
}

export interface EsportsSyncRun {
  id: string;
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'SKIPPED';
  fetched: number;
  accepted: number;
  tournamentsUpserted: number;
  teamsUpserted: number;
  matchesUpserted: number;
  error?: string | null;
  startedAt: string;
  finishedAt?: string | null;
}

export interface PickemPrediction {
  id: string;
  matchId: string;
  predictedTeamId?: string | null;
  predictedTeamName: string;
  points: number;
  settledAt?: string | null;
  match?: Match;
}

export interface PickemEntry {
  id: string;
  tournamentId: string;
  score: number;
  correctPicks: number;
  totalPicks: number;
  predictions: PickemPrediction[];
}

export interface PickemLeaderboardRow {
  rank: number;
  user: { id: string; name: string; avatar?: string | null };
  points: number;
  correctPicks: number;
  totalPicks: number;
}

export interface BrickBreakerLeaderboardEntry {
  rank: number;
  user: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  score: number;
  bricksDestroyed: number;
  level: number;
  durationMs: number;
  achievedAt: string;
}

export interface BrickBreakerLeaderboardResponse {
  items: BrickBreakerLeaderboardEntry[];
  me: BrickBreakerLeaderboardEntry | null;
  totalPlayers: number;
}

export interface BrickBreakerRunSession {
  runToken: string;
  startedAt: string;
  expiresAt: string;
}

export interface BrickBreakerScoreInput {
  runToken: string;
  score: number;
  bricksDestroyed: number;
  level: number;
  durationMs: number;
}

export interface BrickBreakerScoreResult {
  isPersonalBest: boolean;
  bestScore: {
    id: string;
    userId: string;
    score: number;
    bricksDestroyed: number;
    level: number;
    durationMs: number;
    achievedAt: string;
    createdAt: string;
    updatedAt: string;
  };
}

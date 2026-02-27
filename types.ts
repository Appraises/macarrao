
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

export interface Game {
  id: string;
  name: string;
  slug: string;
  image: string;
  genre: GameGenre;
}

export interface Team {
  name: string;
  country: string; // ISO code for flag
  logo?: string;
}

export interface Match {
  id: string;
  game: string;
  competition: string;
  teamA: Team;
  teamB: Team;
  time: string;
  date: string;
  isLive?: boolean;
  scoreA?: number;
  scoreB?: number;
  number_of_games?: number;
  stream?: string;
  oddsA?: number;
  oddsB?: number;
  status?: 'finished' | 'not_started' | 'running' | 'canceled';
}

export interface Tournament {
  id: string;
  name: string;
  game: string;
  logo: string; // URL or placeholder
  status: 'Live' | 'Upcoming' | 'Playoffs' | 'Group Stage';
  dates: string;
  prizePool: string;
  image: string;
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
  round: 'Quarterfinals' | 'Semifinals' | 'Grand Final';
  teamA: { name: string; score: number | null; isWinner?: boolean };
  teamB: { name: string; score: number | null; isWinner?: boolean };
  date: string;
  status: 'Scheduled' | 'Live' | 'Finished';
}

export interface TournamentDetail extends Tournament {
  description: string;
  organizer: string;
  location: string;
  format: string; // e.g. "Double Elimination", "Bo3"
  teams: Team[];
  standings?: StandingRow[];
  bracket?: BracketMatch[];
}

export interface Term {
  id: string;
  word: string;
  definition: string;
  phonetic: string;
  pronunciationGuide: string;
  examples: string[];
  relatedTerms?: string[];
  gameSpecifics?: {
    gameId: string;
    gameName: string;
    context: string;
  }[];
  upvotes: number;
  downvotes: number;
  tags: string[];
  keywords?: string[];
  author?: string;
  authorId?: string;
  verified: boolean;
  gameId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Contribution {
  word: string;
  definition: string;
  gameId?: string;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar: string;
  level: number;
  preferences?: string; // JSON string
  badges?: string[];
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
  category: string;
  image?: string;
  content?: string;
  author?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EsportsNews {
  id: string;
  headline: string;
  category: string;
  timeAgo: string;
  image?: string;
  author?: string;
}

export interface TeamRanking {
  rank: number;
  team: Team;
  points: number;
  trend: 'up' | 'down' | 'stable';
  game: string;
}

export interface PickemUser {
  rank: number;
  user: string;
  points: number;
  percentile: string;
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

// Maps System
export interface MapCallout {
  id: string;
  name: string;
  description?: string;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  type: 'Site' | 'Spawn' | 'Callout' | 'Objective' | 'Item';
}

export interface GameMap {
  id: string;
  gameId: string;
  name: string;
  image: string; // Artistic/Loading screen for cards
  tacticalImage?: string; // Top-down schematic for viewer
  callouts: MapCallout[];
}

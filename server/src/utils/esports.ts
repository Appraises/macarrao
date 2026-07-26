import { ContentStatus, MatchStatus } from '@prisma/client';
import { cleanPlainText, isAllowedMediaUrl, parseOptionalDate, slugify } from './content';

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const text = (value: unknown, max: number) => cleanPlainText(value).slice(0, max);
const optionalMedia = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const integer = (value: unknown, fallback = 0) => {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isInteger(parsed) ? parsed : fallback;
};

export type ValidationResult<T> = { valid: true; data: T } | { valid: false; error: string };

export interface TournamentPayload {
    name: string;
    slug: string;
    gameId: string;
    game: string;
    region: string;
    country: string;
    isBrazilFocused: boolean;
    logo: string | null;
    status: string;
    dates: string | null;
    startAt: Date | null;
    endAt: Date | null;
    publicationStatus: ContentStatus;
    archivedAt: Date | null;
    prizePool: string | null;
    image: string | null;
    description: string | null;
    organizer: string | null;
    location: string | null;
    format: string | null;
    teams: Array<{ teamId: string | null; name: string; country: string }>;
    standings: Array<{ teamId: string | null; rank: number; teamName: string; teamCountry: string; teamLogo: string | null; played: number; wins: number; losses: number; points: number; diff: number; streak: string | null }>;
    bracket: Array<{ matchKey: string; round: string; teamAId: string | null; teamAName: string; teamAScore: number | null; teamAWinner: boolean; teamBId: string | null; teamBName: string; teamBScore: number | null; teamBWinner: boolean; date: string | null; status: string }>;
    stats: Array<{ playerId: string | null; name: string; team: string; country: string; role: string | null; photo: string | null; stats: Record<string, string | number> }>;
}

const formatDateRange = (startAt: Date | null, endAt: Date | null) => {
    if (!startAt && !endAt) return null;
    const format = (date: Date) => date.toISOString().slice(0, 10);
    return startAt && endAt ? `${format(startAt)} - ${format(endAt)}` : format((startAt || endAt)!);
};

export const validateTournamentPayload = (input: unknown): ValidationResult<TournamentPayload> => {
    if (!input || typeof input !== 'object') return { valid: false, error: 'Dados do campeonato invalidos.' };
    const body = input as Record<string, unknown>;
    const name = text(body.name, 140);
    const slug = slugify(body.slug || name);
    const gameId = text(body.gameId, 40);
    const game = text(body.game, 100);
    const status = text(body.status, 40) || 'Upcoming';
    const publicationStatus = typeof body.publicationStatus === 'string' ? body.publicationStatus as ContentStatus : ContentStatus.DRAFT;
    const startAt = parseOptionalDate(body.startAt);
    const endAt = parseOptionalDate(body.endAt);
    const logo = optionalMedia(body.logo);
    const image = optionalMedia(body.image);

    if (name.length < 3) return { valid: false, error: 'O nome do campeonato deve ter ao menos 3 caracteres.' };
    if (slug.length < 2) return { valid: false, error: 'O slug do campeonato e invalido.' };
    if (!isUuid(gameId)) return { valid: false, error: 'Selecione um jogo valido.' };
    if (game.length < 2) return { valid: false, error: 'O nome de exibicao do jogo e obrigatorio.' };
    if (!['Upcoming', 'Live', 'Playoffs', 'Group Stage', 'Finished'].includes(status)) return { valid: false, error: 'Fase do campeonato invalida.' };
    if (!Object.values(ContentStatus).includes(publicationStatus)) return { valid: false, error: 'Estado de publicacao invalido.' };
    if ((body.startAt && startAt === undefined) || (body.endAt && endAt === undefined)) return { valid: false, error: 'As datas do campeonato sao invalidas.' };
    if (startAt && endAt && startAt > endAt) return { valid: false, error: 'A data final deve ser posterior a inicial.' };
    if (publicationStatus === ContentStatus.PUBLISHED && (!startAt || !endAt)) return { valid: false, error: 'Campeonatos publicados precisam de data inicial e final.' };
    if (logo && !isAllowedMediaUrl(logo)) return { valid: false, error: 'O logo deve usar uma URL HTTP(S) valida.' };
    if (image && !isAllowedMediaUrl(image)) return { valid: false, error: 'A imagem deve usar uma URL HTTP(S) valida.' };

    const rawTeams = Array.isArray(body.teams) ? body.teams : [];
    if (rawTeams.length > 64) return { valid: false, error: 'Um campeonato pode ter no maximo 64 equipes.' };
    const teams = rawTeams.map((raw) => {
        const item = raw as Record<string, unknown>;
        const teamId = text(item.teamId, 40);
        return { teamId: teamId || null, name: text(item.name, 100), country: text(item.country, 8).toLowerCase() || 'xx' };
    });
    if (teams.some((team) => team.name.length < 2 || (team.teamId && !isUuid(team.teamId)))) return { valid: false, error: 'Ha uma equipe invalida no campeonato.' };
    const teamNames = new Set(teams.map((team) => team.name.toLowerCase()));
    if (teamNames.size !== teams.length) return { valid: false, error: 'Uma equipe nao pode aparecer duas vezes.' };

    const rawStandings = Array.isArray(body.standings) ? body.standings : [];
    if (rawStandings.length > 128) return { valid: false, error: 'A classificacao excede o limite de 128 linhas.' };
    const standings = rawStandings.map((raw) => {
        const item = raw as Record<string, unknown>;
        const teamId = text(item.teamId, 40);
        const teamLogo = optionalMedia(item.teamLogo);
        return {
            teamId: teamId || null, rank: integer(item.rank), teamName: text(item.teamName, 100), teamCountry: text(item.teamCountry, 8).toLowerCase() || 'xx',
            teamLogo: teamLogo || null, played: integer(item.played), wins: integer(item.wins), losses: integer(item.losses), points: integer(item.points), diff: integer(item.diff), streak: text(item.streak, 20) || null
        };
    });
    const ranks = new Set(standings.map((row) => row.rank));
    if (standings.some((row) => row.rank < 1 || !teamNames.has(row.teamName.toLowerCase()) || row.played < 0 || row.wins < 0 || row.losses < 0)) return { valid: false, error: 'A classificacao possui valores ou equipes invalidas.' };
    if (ranks.size !== standings.length) return { valid: false, error: 'Duas equipes nao podem ocupar a mesma posicao.' };

    const rawBracket = Array.isArray(body.bracket) ? body.bracket : [];
    if (rawBracket.length > 256) return { valid: false, error: 'A chave excede o limite de 256 partidas.' };
    const bracket = rawBracket.map((raw, index) => {
        const item = raw as Record<string, unknown>;
        const scoreA = item.teamAScore === null || item.teamAScore === '' || item.teamAScore === undefined ? null : integer(item.teamAScore, -1);
        const scoreB = item.teamBScore === null || item.teamBScore === '' || item.teamBScore === undefined ? null : integer(item.teamBScore, -1);
        const teamAId = text(item.teamAId, 40);
        const teamBId = text(item.teamBId, 40);
        return {
            matchKey: text(item.matchKey, 50) || `match-${index + 1}`, round: text(item.round, 80), teamAId: teamAId || null, teamAName: text(item.teamAName, 100) || 'TBD',
            teamAScore: scoreA, teamAWinner: item.teamAWinner === true, teamBId: teamBId || null, teamBName: text(item.teamBName, 100) || 'TBD', teamBScore: scoreB,
            teamBWinner: item.teamBWinner === true, date: text(item.date, 40) || null, status: text(item.status, 30) || 'Scheduled'
        };
    });
    const matchKeys = new Set(bracket.map((match) => match.matchKey.toLowerCase()));
    if (matchKeys.size !== bracket.length) return { valid: false, error: 'As chaves das partidas devem ser unicas.' };
    if (bracket.some((match) => !match.round || (match.teamAWinner && match.teamBWinner) || (match.teamAScore !== null && match.teamAScore < 0) || (match.teamBScore !== null && match.teamBScore < 0))) return { valid: false, error: 'O chaveamento possui uma partida inconsistente.' };

    const rawStats = Array.isArray(body.stats) ? body.stats : [];
    if (rawStats.length > 512) return { valid: false, error: 'As estatisticas excedem o limite de 512 jogadores.' };
    const stats = rawStats.map((raw) => {
        const item = raw as Record<string, unknown>;
        const rawValues = item.stats && typeof item.stats === 'object' && !Array.isArray(item.stats) ? item.stats as Record<string, unknown> : {};
        const values: Record<string, string | number> = {};
        Object.entries(rawValues).slice(0, 50).forEach(([key, value]) => { if (typeof value === 'string' || typeof value === 'number') values[text(key, 50)] = value; });
        const playerId = text(item.playerId, 40);
        const photo = optionalMedia(item.photo);
        return { playerId: playerId || null, name: text(item.name, 100), team: text(item.team, 100), country: text(item.country, 8).toLowerCase() || 'xx', role: text(item.role, 50) || null, photo: photo || null, stats: values };
    });
    if (stats.some((row) => row.name.length < 1 || row.team.length < 1 || (row.photo && !isAllowedMediaUrl(row.photo)))) return { valid: false, error: 'Ha uma estatistica de jogador invalida.' };

    return { valid: true, data: {
        name, slug, gameId, game, logo: logo || null, status, dates: formatDateRange(startAt || null, endAt || null), startAt: startAt || null, endAt: endAt || null,
        region: text(body.region, 30).toUpperCase() || 'GLOBAL', country: text(body.country, 8).toLowerCase() || 'xx', isBrazilFocused: body.isBrazilFocused === true,
        publicationStatus, archivedAt: publicationStatus === ContentStatus.ARCHIVED ? new Date() : null,
        prizePool: text(body.prizePool, 80) || null, image: image || null, description: text(body.description, 5000) || null,
        organizer: text(body.organizer, 120) || null, location: text(body.location, 120) || null, format: text(body.format, 200) || null,
        teams, standings, bracket, stats
    } };
};

export interface TeamPayload { name: string; slug: string; country: string; isBrazilian: boolean; logo: string | null; status: ContentStatus; archivedAt: Date | null }
export const validateTeamPayload = (input: unknown): ValidationResult<TeamPayload> => {
    if (!input || typeof input !== 'object') return { valid: false, error: 'Dados da equipe invalidos.' };
    const body = input as Record<string, unknown>; const name = text(body.name, 100); const slug = slugify(body.slug || name); const country = text(body.country, 8).toLowerCase() || 'xx'; const logo = optionalMedia(body.logo); const status = (typeof body.status === 'string' ? body.status : ContentStatus.DRAFT) as ContentStatus;
    if (name.length < 2 || slug.length < 2) return { valid: false, error: 'Nome ou slug da equipe invalido.' };
    if (!Object.values(ContentStatus).includes(status)) return { valid: false, error: 'Estado da equipe invalido.' };
    if (logo && !isAllowedMediaUrl(logo)) return { valid: false, error: 'Logo da equipe invalido.' };
    return { valid: true, data: { name, slug, country, isBrazilian: body.isBrazilian === true || country === 'br', logo: logo || null, status, archivedAt: status === ContentStatus.ARCHIVED ? new Date() : null } };
};

export interface PlayerPayload { teamId: string | null; name: string; nickname: string; slug: string; country: string; role: string | null; photo: string | null; status: ContentStatus; archivedAt: Date | null }
export const validatePlayerPayload = (input: unknown): ValidationResult<PlayerPayload> => {
    if (!input || typeof input !== 'object') return { valid: false, error: 'Dados do jogador invalidos.' };
    const body = input as Record<string, unknown>; const teamId = text(body.teamId, 40); const name = text(body.name, 100); const nickname = text(body.nickname, 80); const slug = slugify(body.slug || nickname); const photo = optionalMedia(body.photo); const status = (typeof body.status === 'string' ? body.status : ContentStatus.DRAFT) as ContentStatus;
    if (teamId && !isUuid(teamId)) return { valid: false, error: 'Equipe do jogador invalida.' };
    if (name.length < 2 || nickname.length < 1 || slug.length < 1) return { valid: false, error: 'Nome, apelido ou slug do jogador invalido.' };
    if (!Object.values(ContentStatus).includes(status)) return { valid: false, error: 'Estado do jogador invalido.' };
    if (photo && !isAllowedMediaUrl(photo)) return { valid: false, error: 'Foto do jogador invalida.' };
    return { valid: true, data: { teamId: teamId || null, name, nickname, slug, country: text(body.country, 8).toLowerCase() || 'xx', role: text(body.role, 50) || null, photo: photo || null, status, archivedAt: status === ContentStatus.ARCHIVED ? new Date() : null } };
};

export interface MatchPayload { gameId: string; tournamentId: string | null; game: string; competition: string; stage: string | null; round: string | null; region: string; isBrazilFocused: boolean; teamAId: string; teamAName: string; teamACountry: string; teamALogo: string | null; teamBId: string; teamBName: string; teamBCountry: string; teamBLogo: string | null; scheduledAt: Date; bestOf: number | null; streamUrl: string | null; vodUrl: string | null; status: MatchStatus; publicationStatus: ContentStatus; archivedAt: Date | null; time: string; date: string; isLive: boolean; scoreA: number | null; scoreB: number | null; oddsA: number | null; oddsB: number | null }
export const validateMatchPayload = (input: unknown): ValidationResult<MatchPayload> => {
    if (!input || typeof input !== 'object') return { valid: false, error: 'Dados da partida invalidos.' };
    const body = input as Record<string, unknown>; const gameId = text(body.gameId, 40); const tournamentId = text(body.tournamentId, 40); const teamAId = text(body.teamAId, 40); const teamBId = text(body.teamBId, 40); const scheduledAt = parseOptionalDate(body.scheduledAt); const status = (typeof body.status === 'string' ? body.status : MatchStatus.SCHEDULED) as MatchStatus; const publicationStatus = (typeof body.publicationStatus === 'string' ? body.publicationStatus : ContentStatus.DRAFT) as ContentStatus;
    if (![gameId, teamAId, teamBId].every(isUuid) || (tournamentId && !isUuid(tournamentId))) return { valid: false, error: 'Jogo, equipes ou campeonato invalido.' };
    if (teamAId === teamBId) return { valid: false, error: 'Uma equipe nao pode jogar contra ela mesma.' };
    if (!scheduledAt) return { valid: false, error: 'Informe uma data e horario validos.' };
    if (!Object.values(MatchStatus).includes(status) || !Object.values(ContentStatus).includes(publicationStatus)) return { valid: false, error: 'Estado da partida invalido.' };
    if (text(body.game, 100).length < 2 || text(body.competition, 140).length < 2 || text(body.teamAName, 100).length < 2 || text(body.teamBName, 100).length < 2) return { valid: false, error: 'Jogo, competicao e equipes sao obrigatorios.' };
    const score = (value: unknown) => value === null || value === '' || value === undefined ? null : integer(value, -1);
    const scoreA = score(body.scoreA); const scoreB = score(body.scoreB); if ((scoreA !== null && scoreA < 0) || (scoreB !== null && scoreB < 0)) return { valid: false, error: 'Placares nao podem ser negativos.' };
    const teamALogo = optionalMedia(body.teamALogo); const teamBLogo = optionalMedia(body.teamBLogo);
    if ((teamALogo && !isAllowedMediaUrl(teamALogo)) || (teamBLogo && !isAllowedMediaUrl(teamBLogo))) return { valid: false, error: 'O logo de uma das equipes e invalido.' };
    const streamUrl = optionalMedia(body.streamUrl); const vodUrl = optionalMedia(body.vodUrl); const bestOf = body.bestOf === null || body.bestOf === '' || body.bestOf === undefined ? null : integer(body.bestOf, -1);
    if ((streamUrl && !isAllowedMediaUrl(streamUrl)) || (vodUrl && !isAllowedMediaUrl(vodUrl))) return { valid: false, error: 'A URL da transmissao ou do VOD e invalida.' };
    if (bestOf !== null && (bestOf < 1 || bestOf > 15 || bestOf % 2 === 0)) return { valid: false, error: 'O formato deve ser uma melhor de numero impar entre 1 e 15.' };
    const displayDate = scheduledAt.toISOString().slice(0, 10); const displayTime = status === MatchStatus.LIVE ? 'Live' : status === MatchStatus.FINISHED ? 'Completed' : scheduledAt.toISOString().slice(11, 16);
    return { valid: true, data: { gameId, tournamentId: tournamentId || null, game: text(body.game, 100), competition: text(body.competition, 140), stage: text(body.stage, 100) || null, round: text(body.round, 100) || null, region: text(body.region, 30).toUpperCase() || 'BR', isBrazilFocused: body.isBrazilFocused !== false, teamAId, teamAName: text(body.teamAName, 100), teamACountry: text(body.teamACountry, 8).toLowerCase() || 'xx', teamALogo: teamALogo || null, teamBId, teamBName: text(body.teamBName, 100), teamBCountry: text(body.teamBCountry, 8).toLowerCase() || 'xx', teamBLogo: teamBLogo || null, scheduledAt, bestOf, streamUrl: streamUrl || null, vodUrl: vodUrl || null, status, publicationStatus, archivedAt: publicationStatus === ContentStatus.ARCHIVED ? new Date() : null, time: displayTime, date: displayDate, isLive: status === MatchStatus.LIVE, scoreA, scoreB, oddsA: typeof body.oddsA === 'number' ? body.oddsA : null, oddsB: typeof body.oddsB === 'number' ? body.oddsB : null } };
};

export interface RankingPayload { gameId: string; teamId: string; game: string; teamName: string; teamCountry: string; rank: number; points: number; trend: string }
export const validateRankingPayload = (input: unknown): ValidationResult<RankingPayload> => {
    if (!input || typeof input !== 'object') return { valid: false, error: 'Dados do ranking invalidos.' };
    const body = input as Record<string, unknown>; const gameId = text(body.gameId, 40); const teamId = text(body.teamId, 40); const rank = integer(body.rank); const points = integer(body.points); const trend = text(body.trend, 10) || 'stable';
    if (!isUuid(gameId) || !isUuid(teamId)) return { valid: false, error: 'Jogo ou equipe invalida.' };
    if (rank < 1 || points < 0 || !['up', 'down', 'stable'].includes(trend)) return { valid: false, error: 'Posicao, pontos ou tendencia invalida.' };
    return { valid: true, data: { gameId, teamId, game: text(body.game, 100), teamName: text(body.teamName, 100), teamCountry: text(body.teamCountry, 8).toLowerCase() || 'xx', rank, points, trend } };
};

import type { Match, Team, Tournament } from '../../types';

// Every time on the hub is shown in Brasília time, whatever the visitor's zone.
export const TIME_ZONE = 'America/Sao_Paulo';
const timeFormat = new Intl.DateTimeFormat('pt-BR', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' });
const dayKeyFormat = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
const weekdayFormat = new Intl.DateTimeFormat('pt-BR', { timeZone: TIME_ZONE, weekday: 'short' });
const dayMonthFormat = new Intl.DateTimeFormat('pt-BR', { timeZone: TIME_ZONE, day: 'numeric', month: 'short' });
const longDayFormat = new Intl.DateTimeFormat('pt-BR', { timeZone: TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long' });

export const instantOf = (value?: string | null): Date | null => {
    const ms = Date.parse(value ?? '');
    return Number.isFinite(ms) ? new Date(ms) : null;
};

export const formatTime = (date: Date) => timeFormat.format(date);
export const dayKey = (date: Date) => dayKeyFormat.format(date);

const clean = (value: string) => value.replace(/\./g, '').trim();

/** "Hoje", "Amanhã", "Ontem" or "sáb, 22 nov", relative to Brasília's calendar day. */
export const relativeDayLabel = (date: Date, now: number) => {
    const key = dayKey(date);
    const today = new Date(now);
    if (key === dayKey(today)) return 'Hoje';
    if (key === dayKey(new Date(now + 86_400_000))) return 'Amanhã';
    if (key === dayKey(new Date(now - 86_400_000))) return 'Ontem';
    return `${clean(weekdayFormat.format(date))}, ${clean(dayMonthFormat.format(date))}`;
};

export const longDayLabel = (date: Date, now: number) => {
    const relative = relativeDayLabel(date, now);
    const full = longDayFormat.format(date);
    return ['Hoje', 'Amanhã', 'Ontem'].includes(relative) ? `${relative} · ${full}` : full;
};

/** "em 45 min", "em 3 h", "em 2 dias" — the countdown shown before a match starts. */
export const countdownLabel = (date: Date, now: number) => {
    const minutes = Math.round((date.getTime() - now) / 60_000);
    if (minutes <= 0) return 'a qualquer momento';
    if (minutes < 60) return `em ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        const rest = minutes % 60;
        return rest && hours < 6 ? `em ${hours} h ${rest} min` : `em ${hours} h`;
    }
    const days = Math.round(hours / 24);
    return days === 1 ? 'amanhã' : `em ${days} dias`;
};

export const teamInitials = (name: string) =>
    name.split(/\s+/).map((part) => part[0] ?? '').join('').slice(0, 3).toUpperCase() || '?';

export const isBrazilianTeam = (team: Team) => team.country?.toLowerCase() === 'br';
export const hasBrazilianTeam = (match: Match) => isBrazilianTeam(match.teamA) || isBrazilianTeam(match.teamB);

export const hasScore = (match: Match) => match.scoreA != null && match.scoreB != null;
export const winnerSide = (match: Match): 'A' | 'B' | null => {
    if (match.status !== 'FINISHED' || !hasScore(match) || match.scoreA === match.scoreB) return null;
    return match.scoreA! > match.scoreB! ? 'A' : 'B';
};

export const matchPath = (match: Match) => `/esports/match/${encodeURIComponent(match.id)}`;
export const tournamentPath = (item: Tournament) => `/esports/tournament/${encodeURIComponent(item.slug || item.id)}`;

export type TournamentPhase = 'ongoing' | 'upcoming' | 'finished';
export const tournamentPhase = (item: Tournament): TournamentPhase =>
    item.status === 'Finished' ? 'finished' : item.status === 'Upcoming' ? 'upcoming' : 'ongoing';

export const tournamentStatusLabel: Record<Tournament['status'], string> = {
    Live: 'Em andamento',
    'Group Stage': 'Fase de grupos',
    Playoffs: 'Playoffs',
    Upcoming: 'Em breve',
    Finished: 'Encerrado',
};

export const hasPrize = (item: Tournament) => Boolean(item.prizePool) && !/^n[aã]o informado$/i.test(item.prizePool);

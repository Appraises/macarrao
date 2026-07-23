import { ESPORTS_FOCUS_KEYWORDS, ESPORTS_FOCUS_TEAMS } from '../../utils/config';
import { ProviderMatch } from './provider';

const normalize = (value: unknown) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const brazilCountryCodes = new Set(['br', 'bra', 'brazil', 'brasil']);

export const isBrazilianCountry = (value: unknown): boolean => brazilCountryCodes.has(normalize(value));

export const isBrazilFocusedMatch = (match: ProviderMatch): boolean => {
    if (isBrazilianCountry(match.teamA.country) || isBrazilianCountry(match.teamB.country)) return true;

    const teams = [normalize(match.teamA.name), normalize(match.teamB.name)];
    if (teams.some((team) => ESPORTS_FOCUS_TEAMS.some((allowed) => team === normalize(allowed)))) return true;

    const haystack = normalize([
        match.tournament.name,
        match.tournament.location,
        match.stage,
        match.round,
    ].filter(Boolean).join(' '));
    return ESPORTS_FOCUS_KEYWORDS.some((keyword) => haystack.includes(normalize(keyword)));
};

export const brazilFocusDescription = () => ({
    countries: ['BR'],
    keywords: ESPORTS_FOCUS_KEYWORDS,
    teams: ESPORTS_FOCUS_TEAMS,
});

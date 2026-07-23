import { describe, expect, it } from 'vitest';
import { validateMatchPayload, validateRankingPayload, validateTournamentPayload } from '../src/utils/esports';

const gameId = '123e4567-e89b-12d3-a456-426614174000';
const teamAId = '123e4567-e89b-12d3-a456-426614174001';
const teamBId = '123e4567-e89b-12d3-a456-426614174002';

const tournament = {
    name: 'Copa de Teste', gameId, game: 'Valorant', status: 'Upcoming', publicationStatus: 'DRAFT',
    teams: [{ teamId: teamAId, name: 'Alpha', country: 'br' }, { teamId: teamBId, name: 'Beta', country: 'pt' }],
    standings: [{ teamId: teamAId, rank: 1, teamName: 'Alpha', teamCountry: 'br', played: 0, wins: 0, losses: 0, points: 0, diff: 0 }],
    bracket: [], stats: []
};

describe('esports content validation', () => {
    it('allows an incomplete tournament as draft', () => {
        const result = validateTournamentPayload(tournament);
        expect(result.valid).toBe(true);
    });

    it('requires dates before publishing a tournament', () => {
        const result = validateTournamentPayload({ ...tournament, publicationStatus: 'PUBLISHED' });
        expect(result.valid).toBe(false);
    });

    it('rejects duplicate standing positions', () => {
        const result = validateTournamentPayload({
            ...tournament,
            standings: [
                tournament.standings[0],
                { teamId: teamBId, rank: 1, teamName: 'Beta', teamCountry: 'pt', played: 0, wins: 0, losses: 0, points: 0, diff: 0 }
            ]
        });
        expect(result.valid).toBe(false);
    });

    it('rejects a match with the same team on both sides', () => {
        const result = validateMatchPayload({
            gameId, game: 'Valorant', competition: 'Copa', teamAId, teamAName: 'Alpha', teamACountry: 'br',
            teamBId: teamAId, teamBName: 'Alpha', teamBCountry: 'br', scheduledAt: new Date(Date.now() + 60_000).toISOString(),
            status: 'SCHEDULED', publicationStatus: 'DRAFT'
        });
        expect(result.valid).toBe(false);
    });

    it('validates ranking position, points and trend', () => {
        expect(validateRankingPayload({ gameId, teamId: teamAId, game: 'Valorant', teamName: 'Alpha', teamCountry: 'br', rank: 1, points: 100, trend: 'up' }).valid).toBe(true);
        expect(validateRankingPayload({ gameId, teamId: teamAId, rank: 0, points: -1, trend: 'sideways' }).valid).toBe(false);
    });
});

import type { TournamentPrizeDistribution } from '../types';

export const prizeDistributions: Readonly<Partial<Record<string, TournamentPrizeDistribution>>> = {
    'worlds-2026': {
        currency: 'USD',
        total: 5_000_000,
        sourceUrl: 'https://bo3.gg/lol/p/worlds-2026',
        rows: [
            { from: 1, to: 1, amountPerTeam: 1_000_000 },
            { from: 2, to: 2, amountPerTeam: 800_000 },
            { from: 3, to: 4, amountPerTeam: 400_000 },
            { from: 5, to: 8, amountPerTeam: 300_000 },
            { from: 9, to: 11, amountPerTeam: 175_000 },
            { from: 12, to: 14, amountPerTeam: 125_000 },
            { from: 15, to: 16, amountPerTeam: 90_000 },
            { from: 17, to: 17, amountPerTeam: 50_000 },
            { from: 18, to: 18, amountPerTeam: 40_000 },
            { from: 19, to: 19, amountPerTeam: 30_000 },
        ],
    },
};

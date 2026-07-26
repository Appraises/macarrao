import { Prisma, TermStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

/**
 * Badge catalog. The condition lives on the backend (it's the source of truth for
 * who earned what); the visual side — icon, colors — lives in the frontend catalog,
 * keyed by the same id. Keep the ids in sync with components/badges.ts.
 *
 * Tiers escalate: bronze (a first step), prata (committed), ouro (rare), lendario
 * (prestige). The mix spans four axes on purpose, so there's always a next badge in
 * reach no matter how someone likes to use the site.
 */
export type BadgeTier = 'bronze' | 'prata' | 'ouro' | 'lendario';

export interface BadgeStats {
    approvedTerms: number;
    topTermUpvotes: number;
    distinctGames: number;
    comments: number;
    hasInflections: boolean;
    hasRegister: boolean;
    addedSecondarySense: boolean;
    level: number;
    isPioneer: boolean; // among the first users to join
}

export interface BadgeDef {
    id: string;
    name: string;
    /** How you earn it — shown to the user, including on locked badges. */
    description: string;
    tier: BadgeTier;
    earned: (s: BadgeStats) => boolean;
}

export const BADGES: BadgeDef[] = [
    // — Contribuição (volume) —
    { id: 'estreante', name: 'Estreante', description: 'Publicou seu primeiro termo.', tier: 'bronze', earned: (s) => s.approvedTerms >= 1 },
    { id: 'colaborador', name: 'Colaborador', description: 'Publicou 10 termos.', tier: 'prata', earned: (s) => s.approvedTerms >= 10 },
    { id: 'autor', name: 'Autor', description: 'Publicou 50 termos.', tier: 'ouro', earned: (s) => s.approvedTerms >= 50 },
    { id: 'lexicografo', name: 'Lexicógrafo', description: 'Publicou 100 termos.', tier: 'lendario', earned: (s) => s.approvedTerms >= 100 },

    // — Popularidade —
    { id: 'viral', name: 'Viral', description: 'Um dos seus termos passou de 100 votos.', tier: 'prata', earned: (s) => s.topTermUpvotes >= 100 },
    { id: 'hall_da_fama', name: 'Hall da Fama', description: 'Um dos seus termos passou de 500 votos.', tier: 'ouro', earned: (s) => s.topTermUpvotes >= 500 },

    // — Diversidade —
    { id: 'multiverso', name: 'Multiverso', description: 'Publicou termos de 5 jogos diferentes.', tier: 'prata', earned: (s) => s.distinctGames >= 5 },

    // — Comunidade —
    { id: 'primeira_voz', name: 'Primeira Voz', description: 'Deixou seu primeiro comentário.', tier: 'bronze', earned: (s) => s.comments >= 1 },
    { id: 'tagarela', name: 'Tagarela', description: 'Deixou 50 comentários.', tier: 'prata', earned: (s) => s.comments >= 50 },

    // — Linguística (as novas camadas do dicionário) —
    { id: 'gramatico', name: 'Gramático', description: 'Registrou as flexões de um termo.', tier: 'bronze', earned: (s) => s.hasInflections },
    { id: 'etiquetador', name: 'Etiquetador', description: 'Classificou o tom de um termo (gíria, ofensivo…).', tier: 'bronze', earned: (s) => s.hasRegister },
    { id: 'multifacetado', name: 'Multifacetado', description: 'Adicionou um novo significado a uma palavra que já existia.', tier: 'prata', earned: (s) => s.addedSecondarySense },

    // — Prestígio —
    { id: 'veterano', name: 'Veterano', description: 'Alcançou o nível 5.', tier: 'prata', earned: (s) => s.level >= 5 },
    { id: 'lenda', name: 'Lenda', description: 'Alcançou o nível 10.', tier: 'lendario', earned: (s) => s.level >= 10 },
    { id: 'pioneiro', name: 'Pioneiro', description: 'Esteve entre os primeiros membros da comunidade.', tier: 'lendario', earned: (s) => s.isPioneer },
];

const PIONEER_CUTOFF = 100; // first N accounts

type Tx = Prisma.TransactionClient | typeof prisma;

/** Gathers everything the catalog conditions need, in a handful of queries. */
export const collectBadgeStats = async (userId: string, db: Tx = prisma): Promise<BadgeStats> => {
    const user = await db.user.findUnique({ where: { id: userId }, select: { level: true, createdAt: true } });
    if (!user) throw new Error('user not found');

    const approvedTermWhere = { authorId: userId, status: TermStatus.APPROVED, archivedAt: null };
    const [approvedTerms, topTerm, games, comments, inflected, registered, secondary, olderAccounts] = await Promise.all([
        db.term.count({ where: approvedTermWhere }),
        db.term.findFirst({ where: approvedTermWhere, orderBy: { upvotes: 'desc' }, select: { upvotes: true } }),
        db.term.findMany({ where: approvedTermWhere, select: { gameId: true } }),
        db.comment.count({ where: { userId } }),
        db.termMeaning.count({ where: { authorId: userId, status: TermStatus.APPROVED, NOT: { inflections: { equals: [] } } } }),
        db.termMeaning.count({ where: { authorId: userId, status: TermStatus.APPROVED, register: { not: null } } }),
        db.termMeaning.count({ where: { authorId: userId, status: TermStatus.APPROVED, order: { gt: 1 } } }),
        db.user.count({ where: { createdAt: { lt: user.createdAt } } }),
    ]);

    return {
        approvedTerms,
        topTermUpvotes: topTerm?.upvotes ?? 0,
        distinctGames: new Set(games.map((g) => g.gameId).filter(Boolean)).size,
        comments,
        hasInflections: inflected > 0,
        hasRegister: registered > 0,
        addedSecondarySense: secondary > 0,
        level: user.level,
        isPioneer: olderAccounts < PIONEER_CUTOFF,
    };
};

/**
 * Grants any newly-qualified badges to a user and returns the ids that were just
 * unlocked (empty when nothing changed). Idempotent: existing badges are skipped.
 * Safe to call after any milestone event.
 */
export const evaluateBadges = async (userId: string): Promise<string[]> => {
    // Defer both calls so a malformed test/transaction client cannot throw
    // synchronously before Promise.all attaches rejection handlers.
    const [stats, owned] = await Promise.all([
        Promise.resolve().then(() => collectBadgeStats(userId)),
        Promise.resolve().then(() => prisma.userBadge.findMany({ where: { userId }, select: { badgeId: true } })),
    ]);
    const ownedIds = new Set(owned.map((b) => b.badgeId));

    const toGrant = BADGES.filter((badge) => badge.earned(stats) && !ownedIds.has(badge.id));
    if (toGrant.length === 0) return [];

    await prisma.userBadge.createMany({
        data: toGrant.map((badge) => ({ userId, badgeId: badge.id })),
        skipDuplicates: true,
    });
    return toGrant.map((badge) => badge.id);
};

/** Earned badges for display, newest first. */
export const getEarnedBadges = (userId: string) =>
    prisma.userBadge.findMany({
        where: { userId },
        orderBy: { earnedAt: 'desc' },
        select: { badgeId: true, earnedAt: true },
    });

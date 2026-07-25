import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    queryRaw: vi.fn(),
    txQueryRaw: vi.fn(),
    txExecuteRaw: vi.fn(),
    gameFindUnique: vi.fn(),
    termFindFirst: vi.fn(),
    termFindUnique: vi.fn(),
    termCreate: vi.fn(),
    termUpdate: vi.fn(),
    termDelete: vi.fn(),
    meaningCreate: vi.fn(),
    meaningFindMany: vi.fn(),
    auditCreate: vi.fn(),
    viewCount: vi.fn(),
    reportFindMany: vi.fn(),
    moderationFindMany: vi.fn(),
    auditFindMany: vi.fn(),
}));

const tx = {
    $queryRaw: mocks.txQueryRaw,
    $executeRaw: mocks.txExecuteRaw,
    game: { findUnique: mocks.gameFindUnique },
    term: {
        findFirst: mocks.termFindFirst,
        findUnique: mocks.termFindUnique,
        findUniqueOrThrow: mocks.termFindUnique,
        create: mocks.termCreate,
        update: mocks.termUpdate,
        delete: mocks.termDelete,
    },
    // A term now owns its meanings; creation seeds the first one and syncs the
    // denormalized columns from them.
    termMeaning: { create: mocks.meaningCreate, findMany: mocks.meaningFindMany },
    adminAuditLog: { create: mocks.auditCreate },
};

vi.mock('../src/lib/prisma', () => ({
    prisma: {
        $queryRaw: mocks.queryRaw,
        $transaction: vi.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
        term: { findFirst: mocks.termFindFirst, findUnique: mocks.termFindUnique },
        termView: { count: mocks.viewCount },
        report: { findMany: mocks.reportFindMany },
        termModerationEvent: { findMany: mocks.moderationFindMany },
        adminAuditLog: { findMany: mocks.auditFindMany, create: mocks.auditCreate },
    },
}));

import {
    AdminTermError,
    createAdminTerm,
    listAdminTerms,
    permanentlyDeleteAdminTerm,
    updateAdminTerm,
} from '../src/services/adminTerms';

const content = {
    word: 'Gank', definition: 'Ataque coordenado contra um adversario.', gameId: null,
    examples: ['Vamos gankar a rota superior.'], tags: ['Estrategia'],
    phonetic: '/gank/', pronunciationGuide: 'guenque', relatedTerms: ['Roaming'],
};
const existing = {
    id: 'term-1', ...content, status: 'APPROVED', revision: 2, archivedAt: null,
    createdAt: new Date(), updatedAt: new Date(), moderatedAt: new Date(), authorId: null,
    upvotes: 0, downvotes: 0,
};

beforeEach(() => {
    vi.clearAllMocks();
    mocks.txQueryRaw.mockResolvedValue([]);
    mocks.txExecuteRaw.mockResolvedValue(1);
    mocks.auditCreate.mockResolvedValue({ id: 'audit-1' });
    mocks.meaningCreate.mockResolvedValue({ id: 'meaning-1' });
    mocks.meaningFindMany.mockResolvedValue([]);
});

describe('administrative term catalog', () => {
    it('lists only approved active terms with editorial metrics and attention filters', async () => {
        mocks.queryRaw
            .mockResolvedValueOnce([{ id: 'term-1', word: 'Gank', definition: content.definition, gameId: null, gameName: null, gameSlug: null, tags: [], examples: [], revision: 2, archivedAt: null, upvotes: 4, downvotes: 1, createdAt: new Date(), updatedAt: new Date(), totalViews: 10, views28d: 7, pendingReports: 1 }])
            .mockResolvedValueOnce([{ count: 1 }])
            .mockResolvedValueOnce([{ active: 4, archived: 1, views28d: 30, pendingReports: 1, needsAttention: 2 }]);

        const result = await listAdminTerms({ state: 'ACTIVE', attention: 'ANY', sort: 'views28d', order: 'desc', skip: 0, take: 20 });
        expect(result.items[0]).toMatchObject({ word: 'Gank', voteBalance: 3, views28d: 7, pendingReports: 1, quality: { needsAttention: true } });
        expect(result.summary).toMatchObject({ active: 4, archived: 1 });
        const sql = (mocks.queryRaw.mock.calls[0][0] as { strings: readonly string[] }).strings.join('?');
        expect(sql).toContain("'APPROVED'");
        expect(sql).toContain('"archivedAt" IS NULL');
        expect(sql).toContain('"pendingReports"');
    });

    it('publishes direct admin creation without an author or contribution side effects', async () => {
        mocks.termCreate.mockImplementation(async ({ data }: any) => ({ id: 'term-1', ...data, createdAt: new Date(), updatedAt: new Date() }));
        const created = await createAdminTerm(content, 'admin-1');
        expect(created).toMatchObject({ word: 'Gank', status: 'APPROVED', authorId: null, revision: 1, archivedAt: null });
        expect(mocks.termCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'APPROVED', authorId: null }) }));
        expect(mocks.auditCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'TERM_CREATE', actorId: 'admin-1' }) }));
    });

    it('rejects stale revisions before updating content', async () => {
        mocks.termFindFirst.mockResolvedValue(existing);
        await expect(updateAdminTerm('term-1', content, 1, 'admin-1')).rejects.toMatchObject({ statusCode: 409 });
        expect(mocks.termUpdate).not.toHaveBeenCalled();
    });

    it('requires archive state and exact textual confirmation for permanent deletion', async () => {
        mocks.termFindFirst.mockResolvedValue(existing);
        await expect(permanentlyDeleteAdminTerm('term-1', 'Gank', 'admin-1')).rejects.toBeInstanceOf(AdminTermError);
        mocks.termFindFirst.mockResolvedValue({ ...existing, archivedAt: new Date() });
        await expect(permanentlyDeleteAdminTerm('term-1', 'gank', 'admin-1')).rejects.toMatchObject({ statusCode: 400 });
        await permanentlyDeleteAdminTerm('term-1', 'Gank', 'admin-1');
        expect(mocks.termDelete).toHaveBeenCalledWith({ where: { id: 'term-1' } });
        expect(mocks.auditCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'TERM_DELETE' }) }));
    });
});

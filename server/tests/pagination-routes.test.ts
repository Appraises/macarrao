import express, { Router } from 'express';
import { AddressInfo } from 'net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    termFindMany: vi.fn(),
    termCount: vi.fn(),
    newsFindMany: vi.fn(),
    newsCount: vi.fn(),
    commentGroupBy: vi.fn(),
    commentCount: vi.fn(),
    newsUpdateMany: vi.fn(),
    auditCreateMany: vi.fn(),
    userFindMany: vi.fn(),
    userCount: vi.fn(),
    queryRaw: vi.fn(),
    transaction: vi.fn(async (operations: Promise<unknown>[]) => Promise.all(operations))
}));

vi.mock('../src/lib/prisma', () => ({
    prisma: {
        term: {
            findMany: mocks.termFindMany,
            count: mocks.termCount
        },
        news: {
            findMany: mocks.newsFindMany,
            count: mocks.newsCount,
            updateMany: mocks.newsUpdateMany
        },
        comment: {
            groupBy: mocks.commentGroupBy,
            count: mocks.commentCount
        },
        adminAuditLog: {
            createMany: mocks.auditCreateMany
        },
        user: {
            findMany: mocks.userFindMany,
            count: mocks.userCount
        },
        $transaction: mocks.transaction,
        $queryRaw: mocks.queryRaw
    }
}));

vi.mock('../src/middleware/auth', () => ({
    authenticateToken: (req: any, _res: any, next: () => void) => {
        req.user = { id: 'admin-id', name: 'Admin', role: 'ADMIN' };
        next();
    },
    optionalAuthenticateToken: (_req: any, _res: any, next: () => void) => next()
}));

import termsRouter from '../src/routes/terms';
import newsRouter from '../src/routes/news';
import dashboardRouter from '../src/routes/dashboard';

const request = async (router: Router, path: string) => {
    const app = express();
    app.use(express.json());
    app.use(router);
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', () => resolve()));

    try {
        const address = server.address() as AddressInfo;
        const response = await fetch(`http://127.0.0.1:${address.port}${path}`);
        const body = await response.json();
        return { response, body };
    } finally {
        await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
};

beforeEach(() => {
    vi.clearAllMocks();
    mocks.newsUpdateMany.mockResolvedValue({ count: 0 });
    mocks.auditCreateMany.mockResolvedValue({ count: 0 });
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('paginated route contracts', () => {
    it('paginates and searches terms with stable ordering', async () => {
        mocks.termFindMany.mockResolvedValue([{ id: 'term-3', word: 'Gank' }]);
        mocks.queryRaw
            .mockResolvedValueOnce([{ id: 'term-3', relevance: 1000 }])
            .mockResolvedValueOnce([{ count: 5 }]);

        const { response, body } = await request(
            termsRouter,
            '/?page=2&pageSize=2&search=gank&sort=word&order=asc'
        );

        expect(response.status).toBe(200);
        expect(body).toEqual({
            items: [{ id: 'term-3', word: 'Gank' }],
            pagination: {
                page: 2,
                pageSize: 2,
                total: 5,
                totalPages: 3,
                hasNext: true,
                hasPrevious: true
            }
        });
        expect(mocks.queryRaw).toHaveBeenCalledTimes(2);
        expect(mocks.termFindMany).toHaveBeenCalledWith({
            where: { id: { in: ['term-3'] } },
            include: { game: true }
        });
    });

    it('rejects oversized news pages before querying the database', async () => {
        const { response, body } = await request(newsRouter, '/?page=1&pageSize=101');

        expect(response.status).toBe(400);
        expect(body.error).toContain('menor ou igual a 100');
        expect(mocks.newsFindMany).not.toHaveBeenCalled();
    });

    it('returns the real comment count for public news cards', async () => {
        mocks.newsFindMany
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([{ id: 'news-1', headline: 'Noticia publicada' }]);
        mocks.newsCount.mockResolvedValue(1);
        mocks.commentGroupBy.mockResolvedValue([]);

        const { response, body } = await request(newsRouter, '/?page=1&pageSize=12');

        expect(response.status).toBe(200);
        expect(body.items).toEqual([{ id: 'news-1', headline: 'Noticia publicada', commentsCount: 0, content: '', authorProfile: null }]);
        expect(mocks.commentGroupBy).toHaveBeenCalledWith({
            by: ['newsId'],
            where: { newsId: { in: ['news-1'] } },
            _count: { _all: true }
        });
    });

    it('keeps public news comment counts isolated per article', async () => {
        mocks.newsFindMany
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([
                { id: 'news-with-comments', headline: 'Noticia com comentarios' },
                { id: 'news-without-comments', headline: 'Noticia sem comentarios' }
            ]);
        mocks.newsCount.mockResolvedValue(2);
        mocks.commentGroupBy.mockResolvedValue([
            { newsId: 'news-with-comments', _count: { _all: 3 } }
        ]);

        const { response, body } = await request(newsRouter, '/?page=1&pageSize=12');

        expect(response.status).toBe(200);
        expect(body.items.map((item: { id: string; commentsCount: number }) => [item.id, item.commentsCount])).toEqual([
            ['news-with-comments', 3],
            ['news-without-comments', 0]
        ]);
    });

    it('rejects legacy private-status parameters on public term routes', async () => {
        const { response, body } = await request(termsRouter, '/?page=1&pageSize=20&verified=false');

        expect(response.status).toBe(400);
        expect(body.error).toContain('rotas de contribuicoes');
        expect(mocks.queryRaw).not.toHaveBeenCalled();
    });

    it('returns paginated users without selecting credentials', async () => {
        mocks.userFindMany.mockResolvedValue([{
            id: 'user-1',
            name: 'Admin',
            email: 'admin@example.com',
            role: 'ADMIN',
            level: 99,
            avatar: null,
            createdAt: new Date('2026-01-01T00:00:00.000Z')
        }]);
        mocks.userCount.mockResolvedValue(1);

        const { response, body } = await request(
            dashboardRouter,
            '/users?page=1&pageSize=10&search=admin&role=ADMIN'
        );

        expect(response.status).toBe(200);
        expect(body.pagination.total).toBe(1);
        expect(body.items).toHaveLength(1);
        expect(mocks.userFindMany).toHaveBeenCalledWith(expect.objectContaining({
            skip: 0,
            take: 10,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                level: true,
                avatar: true,
                createdAt: true
            }
        }));
    });

    it('keeps the temporary legacy news array with a deprecation header', async () => {
        mocks.newsFindMany.mockResolvedValue([]);

        const { response, body } = await request(newsRouter, '/');

        expect(response.status).toBe(200);
        expect(body).toEqual([]);
        expect(response.headers.get('deprecation')).toBe('true');
        expect(response.headers.get('x-pagination-deprecated')).toBe('true');
    });
});

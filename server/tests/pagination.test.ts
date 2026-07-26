import { describe, expect, it } from 'vitest';
import { buildPaginationMeta, parsePagination } from '../src/utils/pagination';

const options = {
    allowedSorts: ['createdAt', 'name'] as const,
    defaultSort: 'createdAt' as const
};

describe('parsePagination', () => {
    it('uses defensive defaults without marking legacy calls as paginated', () => {
        const result = parsePagination({}, options);
        expect(result).toEqual({
            valid: true,
            value: {
                requested: false,
                page: 1,
                pageSize: 20,
                skip: 0,
                take: 20,
                search: undefined,
                sort: 'createdAt',
                order: 'desc'
            }
        });
    });

    it('parses page, page size, search and sorting', () => {
        const result = parsePagination({
            page: '3',
            pageSize: '25',
            search: '  gamer  ',
            sort: 'name',
            order: 'asc'
        }, options);

        expect(result).toMatchObject({
            valid: true,
            value: {
                requested: true,
                page: 3,
                pageSize: 25,
                skip: 50,
                take: 25,
                search: 'gamer',
                sort: 'name',
                order: 'asc'
            }
        });
    });

    it.each([
        [{ page: '0' }, 'page deve ser'],
        [{ page: '1.5' }, 'page deve ser'],
        [{ pageSize: '101' }, 'pageSize deve ser menor'],
        [{ sort: 'password' }, 'sort deve ser um de'],
        [{ order: 'sideways' }, 'order deve ser'],
        [{ search: 'a'.repeat(101) }, 'search deve ter no maximo']
    ])('rejects invalid query %#', (query, message) => {
        const result = parsePagination(query, options);
        expect(result.valid).toBe(false);
        if (!result.valid) expect(result.error).toContain(message);
    });
});

describe('buildPaginationMeta', () => {
    it('builds navigation metadata for a middle page', () => {
        expect(buildPaginationMeta(45, { page: 2, pageSize: 20 })).toEqual({
            page: 2,
            pageSize: 20,
            total: 45,
            totalPages: 3,
            hasNext: true,
            hasPrevious: true
        });
    });

    it('handles an empty result set', () => {
        expect(buildPaginationMeta(0, { page: 1, pageSize: 20 })).toEqual({
            page: 1,
            pageSize: 20,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrevious: false
        });
    });
});

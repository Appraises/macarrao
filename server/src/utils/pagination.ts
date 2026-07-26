import { Request } from 'express';

export interface PaginationOptions<TSort extends string> {
    allowedSorts: readonly TSort[];
    defaultSort: TSort;
    defaultOrder?: 'asc' | 'desc';
    defaultPageSize?: number;
    maxPageSize?: number;
    maxSearchLength?: number;
}

export interface ParsedPagination<TSort extends string> {
    requested: boolean;
    page: number;
    pageSize: number;
    skip: number;
    take: number;
    search?: string;
    sort: TSort;
    order: 'asc' | 'desc';
}

export interface PaginationMeta {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
}

export type PaginationResult<TSort extends string> =
    | { valid: true; value: ParsedPagination<TSort> }
    | { valid: false; error: string };

const getSingleQueryValue = (value: unknown): string | undefined => {
    if (value === undefined) return undefined;
    if (typeof value !== 'string') return undefined;
    return value;
};

const parsePositiveInteger = (value: string | undefined, fallback: number): number | null => {
    if (value === undefined) return fallback;
    if (!/^\d+$/.test(value)) return null;

    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1) return null;
    return parsed;
};

export const parsePagination = <TSort extends string>(
    query: Request['query'],
    options: PaginationOptions<TSort>
): PaginationResult<TSort> => {
    const pageValue = getSingleQueryValue(query.page);
    const pageSizeValue = getSingleQueryValue(query.pageSize);
    const searchValue = getSingleQueryValue(query.search);
    const sortValue = getSingleQueryValue(query.sort);
    const orderValue = getSingleQueryValue(query.order);
    const requested = ['page', 'pageSize', 'search', 'sort', 'order'].some((key) => query[key] !== undefined);

    if (query.page !== undefined && pageValue === undefined) {
        return { valid: false, error: 'O parametro page deve ser um unico numero inteiro.' };
    }
    if (query.pageSize !== undefined && pageSizeValue === undefined) {
        return { valid: false, error: 'O parametro pageSize deve ser um unico numero inteiro.' };
    }
    if (query.search !== undefined && searchValue === undefined) {
        return { valid: false, error: 'O parametro search deve ser um unico texto.' };
    }
    if (query.sort !== undefined && sortValue === undefined) {
        return { valid: false, error: 'O parametro sort deve ser um unico texto.' };
    }
    if (query.order !== undefined && orderValue === undefined) {
        return { valid: false, error: 'O parametro order deve ser asc ou desc.' };
    }

    const page = parsePositiveInteger(pageValue, 1);
    if (page === null) return { valid: false, error: 'page deve ser um inteiro maior ou igual a 1.' };

    const defaultPageSize = options.defaultPageSize ?? 20;
    const maxPageSize = options.maxPageSize ?? 100;
    const pageSize = parsePositiveInteger(pageSizeValue, defaultPageSize);
    if (pageSize === null) return { valid: false, error: 'pageSize deve ser um inteiro maior ou igual a 1.' };
    if (pageSize > maxPageSize) return { valid: false, error: `pageSize deve ser menor ou igual a ${maxPageSize}.` };

    const search = searchValue?.trim();
    const maxSearchLength = options.maxSearchLength ?? 100;
    if (search && search.length > maxSearchLength) {
        return { valid: false, error: `search deve ter no maximo ${maxSearchLength} caracteres.` };
    }

    const sort = (sortValue || options.defaultSort) as TSort;
    if (!options.allowedSorts.includes(sort)) {
        return { valid: false, error: `sort deve ser um de: ${options.allowedSorts.join(', ')}.` };
    }

    const order = orderValue || options.defaultOrder || 'desc';
    if (order !== 'asc' && order !== 'desc') {
        return { valid: false, error: 'order deve ser asc ou desc.' };
    }

    return {
        valid: true,
        value: {
            requested,
            page,
            pageSize,
            skip: (page - 1) * pageSize,
            take: pageSize,
            search: search || undefined,
            sort,
            order
        }
    };
};

export const buildPaginationMeta = (
    total: number,
    pagination: Pick<ParsedPagination<string>, 'page' | 'pageSize'>
): PaginationMeta => {
    const totalPages = total === 0 ? 0 : Math.ceil(total / pagination.pageSize);
    return {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrevious: pagination.page > 1 && totalPages > 0
    };
};


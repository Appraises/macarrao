import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

const parsePositiveInteger = (value: string | null, fallback: number): number => {
    if (!value || !/^\d+$/.test(value)) return fallback;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const usePaginatedListQuery = (defaultPageSize = 20) => {
    const [params, setParams] = useSearchParams();
    const page = parsePositiveInteger(params.get('page'), 1);
    const pageSize = Math.min(parsePositiveInteger(params.get('pageSize'), defaultPageSize), 100);
    const search = params.get('search') || '';

    const update = useCallback((values: { page?: number; pageSize?: number; search?: string }) => {
        const next = new URLSearchParams(params);

        if (values.page !== undefined) {
            if (values.page <= 1) next.delete('page');
            else next.set('page', String(values.page));
        }
        if (values.pageSize !== undefined) {
            if (values.pageSize === defaultPageSize) next.delete('pageSize');
            else next.set('pageSize', String(values.pageSize));
        }
        if (values.search !== undefined) {
            const trimmed = values.search.slice(0, 100);
            if (trimmed) next.set('search', trimmed);
            else next.delete('search');
        }

        setParams(next, { replace: true });
    }, [defaultPageSize, params, setParams]);

    const setPage = useCallback((nextPage: number) => update({ page: nextPage }), [update]);
    const setPageSize = useCallback((nextPageSize: number) => update({ page: 1, pageSize: nextPageSize }), [update]);
    const setSearch = useCallback((nextSearch: string) => update({ page: 1, search: nextSearch }), [update]);

    return { page, pageSize, search, setPage, setPageSize, setSearch };
};

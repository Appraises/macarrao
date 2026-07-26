import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationMeta } from '../types';

interface PaginationControlsProps {
    pagination: PaginationMeta;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    disabled?: boolean;
    pageSizeOptions?: number[];
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
    pagination,
    onPageChange,
    onPageSizeChange,
    disabled = false,
    pageSizeOptions = [10, 20, 50]
}) => {
    const visibleTotalPages = Math.max(pagination.totalPages, 1);
    const firstItem = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
    const lastItem = Math.min(pagination.page * pagination.pageSize, pagination.total);

    return (
        <div className="flex flex-col gap-3 border-t border-white/5 px-4 py-3 text-sm text-gray-400 sm:flex-row sm:items-center sm:justify-between">
            <span>
                {pagination.total === 0
                    ? 'Nenhum resultado'
                    : `${firstItem}-${lastItem} de ${pagination.total}`}
            </span>

            <div className="flex flex-wrap items-center gap-3">
                {onPageSizeChange && (
                    <label className="flex items-center gap-2">
                        <span className="sr-only">Itens por pagina</span>
                        <select
                            aria-label="Itens por pagina"
                            value={pagination.pageSize}
                            onChange={(event) => onPageSizeChange(Number(event.target.value))}
                            disabled={disabled}
                            className="h-9 rounded border border-white/10 bg-dark-950 px-2 text-gray-300 focus:border-brand-500 focus:outline-none"
                        >
                            {pageSizeOptions.map((option) => (
                                <option key={option} value={option}>{option} por pagina</option>
                            ))}
                        </select>
                    </label>
                )}

                <span className="min-w-24 text-center">
                    Pagina {pagination.page} de {visibleTotalPages}
                </span>

                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        title="Pagina anterior"
                        aria-label="Pagina anterior"
                        onClick={() => onPageChange(pagination.page - 1)}
                        disabled={disabled || !pagination.hasPrevious}
                        className="grid h-9 w-9 place-items-center rounded border border-white/10 text-gray-300 hover:border-brand-500/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        title="Proxima pagina"
                        aria-label="Proxima pagina"
                        onClick={() => onPageChange(pagination.page + 1)}
                        disabled={disabled || !pagination.hasNext}
                        className="grid h-9 w-9 place-items-center rounded border border-white/10 text-gray-300 hover:border-brand-500/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

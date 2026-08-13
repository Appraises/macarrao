import { TermStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const dateKeyInSaoPaulo = (value = new Date()): string => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
}).format(value);

export const getTermOfTheDay = async (value = new Date()) => {
    const count = await prisma.term.count({ where: { status: TermStatus.APPROVED, archivedAt: null } });
    if (count === 0) return null;

    const seed = Number(dateKeyInSaoPaulo(value).replace(/-/g, ''));
    return prisma.term.findFirst({
        where: { status: TermStatus.APPROVED, archivedAt: null },
        orderBy: { id: 'asc' },
        skip: seed % count,
        include: { game: { select: { id: true, name: true, slug: true } } },
    });
};

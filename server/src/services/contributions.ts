import {
    ContributionRejectionReason,
    NotificationEmailStatus,
    NotificationType,
    Prisma,
    Register,
    TermModerationEventType,
    TermStatus,
    WordClass
} from '@prisma/client';
import { prisma } from '../lib/prisma';
import { cleanPlainText } from '../utils/content';
import { termSnapshot } from '../utils/terms';
import { writeAuditLog } from './audit';
import { sendContributionDecisionEmail } from './email';
import { awardXp } from './leveling';
import { evaluateBadges } from './badges';
import { emitContributionQueueUpdate, emitUserNotification } from './realtime';
import { normalizeCatalogSearch } from './termCatalog';
import { syncTermFromMeanings } from './termMeanings';
import { consumeContributionAccountSlot } from './abuseProtection';
import { CONTRIBUTION_ACCOUNT_LIMIT } from '../utils/config';

export interface ContributionContent {
    word: string;
    definition: string;
    gameId: string | null;
    examples: string[];
    tags: string[];
    phonetic?: string | null;
    pronunciationGuide?: string | null;
    relatedTerms?: string[];
    // Linguistic layer, carried into the term's first sense.
    wordClass?: WordClass | null;
    register?: Register | null;
    inflections?: Array<{ label: string; form: string }>;
}

/** Splits contribution input into term-level columns and the first sense's fields. */
const splitContribution = (content: ContributionContent) => {
    const { wordClass, register, inflections, ...termFields } = content;
    return {
        termFields,
        meaning: {
            definition: content.definition,
            examples: content.examples,
            gameId: content.gameId,
            wordClass: wordClass ?? null,
            register: register ?? null,
            inflections: (inflections ?? []) as unknown as Prisma.InputJsonValue,
        },
    };
};

export type ModerationAction = 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';

export class ContributionError extends Error {
    constructor(
        public readonly statusCode: number,
        message: string,
        public readonly code?: string,
        public readonly retryAfterSeconds?: number,
    ) {
        super(message);
    }
}

export const contributionSummaryInclude = {
    game: { select: { id: true, name: true, slug: true } },
    moderationEvents: {
        where: {
            type: {
                in: [
                    TermModerationEventType.CHANGES_REQUESTED,
                    TermModerationEventType.APPROVED,
                    TermModerationEventType.REJECTED
                ]
            }
        },
        orderBy: { createdAt: 'desc' as const },
        take: 1,
        select: {
            id: true,
            type: true,
            toStatus: true,
            revision: true,
            authorMessage: true,
            rejectionReason: true,
            createdAt: true
        }
    }
} satisfies Prisma.TermInclude;

export const contributionPublicDetailInclude = {
    game: { select: { id: true, name: true, slug: true } },
    moderationEvents: {
        orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
        select: {
            id: true,
            type: true,
            fromStatus: true,
            toStatus: true,
            revision: true,
            authorMessage: true,
            rejectionReason: true,
            snapshot: true,
            createdAt: true,
            actor: { select: { id: true, name: true, role: true } }
        }
    }
} satisfies Prisma.TermInclude;

export const contributionAdminDetailInclude = {
    game: { select: { id: true, name: true, slug: true } },
    author: { select: { id: true, name: true, email: true, avatar: true, level: true } },
    moderationEvents: {
        orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
        include: { actor: { select: { id: true, name: true, email: true, role: true } } }
    }
} satisfies Prisma.TermInclude;

const ensureGameExists = async (
    gameId: string | null,
    client: Pick<Prisma.TransactionClient, 'game'> | typeof prisma = prisma
) => {
    if (!gameId) return;
    const game = await client.game.findUnique({ where: { id: gameId }, select: { id: true } });
    if (!game) throw new ContributionError(400, 'O jogo selecionado nao existe.');
};

const normalizeDecisionText = (value: unknown, label: string, maximum: number) => {
    const text = cleanPlainText(value);
    if (text.length > maximum) throw new ContributionError(400, `${label} deve ter no maximo ${maximum} caracteres.`);
    return text;
};

const emailNotificationsEnabled = (preferences: Prisma.JsonValue): boolean => {
    if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) return true;
    return (preferences as Record<string, unknown>).emailNotifications !== false;
};

export const createContribution = async (authorId: string, content: ContributionContent) => {
    await ensureGameExists(content.gameId);
    const { termFields, meaning } = splitContribution(content);
    return prisma.$transaction(async (tx) => {
        const accountLimit = await consumeContributionAccountSlot(authorId, tx);
        if (!accountLimit.allowed) {
            throw new ContributionError(
                429,
                `Voce atingiu o limite de ${CONTRIBUTION_ACCOUNT_LIMIT} novas contribuicoes neste periodo. Aguarde antes de enviar outra.`,
                'CONTRIBUTION_ACCOUNT_RATE_LIMITED',
                accountLimit.retryAfterSeconds,
            );
        }
        const term = await tx.term.create({
            data: {
                ...termFields,
                authorId,
                status: TermStatus.PENDING,
                revision: 1
            },
            include: contributionPublicDetailInclude
        });
        // The entry needs a sense from the start; it rides the term's moderation
        // status so approving the contribution publishes both at once.
        await tx.termMeaning.create({
            data: { ...meaning, termId: term.id, authorId, order: 1, status: TermStatus.PENDING },
        });
        await tx.termModerationEvent.create({
            data: {
                termId: term.id,
                actorId: authorId,
                type: TermModerationEventType.SUBMITTED,
                toStatus: TermStatus.PENDING,
                revision: 1,
                snapshot: termSnapshot(term)
            }
        });
        return tx.term.findUniqueOrThrow({ where: { id: term.id }, include: contributionPublicDetailInclude });
    });
};

export const updateOwnContribution = async (input: {
    termId: string;
    authorId: string;
    expectedRevision: number;
    content: ContributionContent;
}) => prisma.$transaction(async (tx) => {
    const existing = await tx.term.findFirst({
        where: { id: input.termId, authorId: input.authorId },
        select: {
            id: true,
            status: true,
            revision: true,
            word: true,
            definition: true,
            gameId: true,
            examples: true,
            tags: true
        }
    });
    if (!existing) throw new ContributionError(404, 'Contribuicao nao encontrada.');
    if (existing.status !== TermStatus.PENDING && existing.status !== TermStatus.CHANGES_REQUESTED) {
        throw new ContributionError(409, 'Esta contribuicao nao pode mais ser editada.');
    }
    if (existing.revision !== input.expectedRevision) {
        throw new ContributionError(409, 'A contribuicao foi atualizada. Recarregue antes de salvar novamente.');
    }
    await ensureGameExists(input.content.gameId, tx);

    const nextStatus = existing.status === TermStatus.CHANGES_REQUESTED
        ? TermStatus.PENDING
        : existing.status;
    const nextRevision = existing.revision + 1;
    // The linguistic fields belong to the sense, not to "Term" — spreading the whole
    // payload here would hand Prisma columns that do not exist.
    const { termFields, meaning } = splitContribution(input.content);
    const updated = await tx.term.updateMany({
        where: {
            id: existing.id,
            authorId: input.authorId,
            revision: input.expectedRevision,
            status: existing.status
        },
        data: {
            ...termFields,
            status: nextStatus,
            revision: { increment: 1 }
        }
    });
    if (updated.count !== 1) {
        throw new ContributionError(409, 'A contribuicao mudou durante a edicao. Recarregue e tente novamente.');
    }

    // Keep the first sense in step with the edited contribution.
    const firstMeaning = await tx.termMeaning.findFirst({ where: { termId: existing.id }, orderBy: { order: 'asc' }, select: { id: true } });
    if (firstMeaning) await tx.termMeaning.update({ where: { id: firstMeaning.id }, data: { ...meaning, status: nextStatus } });
    else await tx.termMeaning.create({ data: { ...meaning, termId: existing.id, authorId: input.authorId, order: 1, status: nextStatus } });

    await tx.termModerationEvent.create({
        data: {
            termId: existing.id,
            actorId: input.authorId,
            type: existing.status === TermStatus.CHANGES_REQUESTED
                ? TermModerationEventType.RESUBMITTED
                : TermModerationEventType.AUTHOR_UPDATED,
            fromStatus: existing.status,
            toStatus: nextStatus,
            revision: nextRevision,
            snapshot: termSnapshot(input.content)
        }
    });

    return tx.term.findUniqueOrThrow({ where: { id: existing.id }, include: contributionPublicDetailInclude });
});

const decisionConfiguration = (action: ModerationAction) => {
    if (action === 'APPROVE') return {
        status: TermStatus.APPROVED,
        event: TermModerationEventType.APPROVED,
        notification: NotificationType.CONTRIBUTION_APPROVED,
        title: 'Contribuicao aprovada'
    } as const;
    if (action === 'REJECT') return {
        status: TermStatus.REJECTED,
        event: TermModerationEventType.REJECTED,
        notification: NotificationType.CONTRIBUTION_REJECTED,
        title: 'Contribuicao rejeitada'
    } as const;
    return {
        status: TermStatus.CHANGES_REQUESTED,
        event: TermModerationEventType.CHANGES_REQUESTED,
        notification: NotificationType.CONTRIBUTION_CHANGES_REQUESTED,
        title: 'Revisao solicitada'
    } as const;
};

export const moderateContribution = async (input: {
    termId: string;
    moderatorId: string;
    expectedRevision: number;
    action: ModerationAction;
    authorMessage?: unknown;
    internalNote?: unknown;
    rejectionReason?: ContributionRejectionReason;
}) => {
    const authorMessage = normalizeDecisionText(input.authorMessage, 'A mensagem ao autor', 1000);
    const internalNote = normalizeDecisionText(input.internalNote, 'A nota interna', 2000);
    if (input.action !== 'APPROVE' && authorMessage.length < 5) {
        throw new ContributionError(400, 'Informe uma mensagem ao autor com pelo menos 5 caracteres.');
    }
    if (input.action === 'REJECT' && !input.rejectionReason) {
        throw new ContributionError(400, 'Informe o motivo da rejeicao.');
    }
    if (input.action !== 'REJECT' && input.rejectionReason) {
        throw new ContributionError(400, 'Motivo de rejeicao so pode ser usado ao rejeitar.');
    }

    const config = decisionConfiguration(input.action);
    const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.term.findUnique({
            where: { id: input.termId },
            include: {
                author: { select: { id: true, name: true, email: true, preferences: true } },
                game: { select: { id: true, name: true, slug: true } }
            }
        });
        if (!existing) throw new ContributionError(404, 'Contribuicao nao encontrada.');
        if (existing.revision !== input.expectedRevision) {
            throw new ContributionError(409, 'A contribuicao foi atualizada pelo autor. Recarregue antes de decidir.');
        }

        const statusAllowed = input.action === 'REJECT'
            ? existing.status === TermStatus.PENDING || existing.status === TermStatus.CHANGES_REQUESTED
            : existing.status === TermStatus.PENDING;
        if (!statusAllowed) {
            throw new ContributionError(409, 'Esta transicao de moderacao nao e permitida para o status atual.');
        }

        if (input.action === 'APPROVE') {
            const normalizedWord = normalizeCatalogSearch(existing.word);
            // $executeRaw, not $queryRaw: the lock returns void and Prisma cannot
            // deserialize a void column, which made every approval fail here.
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${normalizedWord}))`;
            const duplicate = await tx.$queryRaw<Array<{ id: string; word: string }>>(Prisma.sql`
                SELECT "id", "word" FROM "Term"
                WHERE "status" = 'APPROVED'::"TermStatus"
                  AND public.dicionario_normalize("word") = ${normalizedWord}
                  AND "id" <> ${existing.id}
                LIMIT 1
            `);
            if (duplicate[0]) {
                throw new ContributionError(409, `Ja existe um termo publicado com a palavra "${duplicate[0].word}".`);
            }
        }

        const updated = await tx.term.updateMany({
            where: { id: existing.id, revision: input.expectedRevision, status: existing.status },
            data: { status: config.status, moderatedAt: new Date() }
        });
        if (updated.count !== 1) {
            throw new ContributionError(409, 'A contribuicao mudou durante a moderacao. Recarregue e tente novamente.');
        }

        // The term's senses follow its moderation outcome, otherwise an approved entry
        // would publish with no visible meaning behind it.
        await tx.termMeaning.updateMany({ where: { termId: existing.id }, data: { status: config.status } });
        if (input.action === 'APPROVE') await syncTermFromMeanings(existing.id, tx);

        const effectiveMessage = authorMessage || 'Sua contribuicao foi aprovada e ja esta disponivel no dicionario.';
        await tx.termModerationEvent.create({
            data: {
                termId: existing.id,
                actorId: input.moderatorId,
                type: config.event,
                fromStatus: existing.status,
                toStatus: config.status,
                revision: existing.revision,
                authorMessage: effectiveMessage,
                internalNote: internalNote || null,
                rejectionReason: input.action === 'REJECT' ? input.rejectionReason : null,
                snapshot: termSnapshot(existing)
            }
        });

        if (input.action === 'APPROVE' && existing.authorId) {
            await awardXp(existing.authorId, 50, tx);
        }

        const notification = existing.author ? await tx.notification.create({
            data: {
                userId: existing.author.id,
                termId: existing.id,
                type: config.notification,
                title: config.title,
                message: effectiveMessage,
                link: `/minhas-contribuicoes/${existing.id}`,
                data: {
                    status: config.status,
                    revision: existing.revision,
                    ...(input.rejectionReason ? { rejectionReason: input.rejectionReason } : {})
                },
                emailStatus: emailNotificationsEnabled(existing.author.preferences)
                    ? NotificationEmailStatus.PENDING
                    : NotificationEmailStatus.SKIPPED
            }
        }) : null;

        await writeAuditLog({
            actorId: input.moderatorId,
            action: input.action,
            entityType: 'TERM_CONTRIBUTION',
            entityId: existing.id,
            before: { status: existing.status, revision: existing.revision },
            after: { status: config.status, revision: existing.revision },
            metadata: {
                rejectionReason: input.rejectionReason || null,
                hasAuthorMessage: Boolean(effectiveMessage),
                hasInternalNote: Boolean(internalNote)
            }
        }, tx);

        const detail = await tx.term.findUniqueOrThrow({
            where: { id: existing.id },
            include: contributionAdminDetailInclude
        });
        return { detail, notification, author: existing.author, message: effectiveMessage };
    });

    emitContributionQueueUpdate({
        termId: result.detail.id,
        status: result.detail.status,
        revision: result.detail.revision
    });

    if (result.notification) {
        emitUserNotification(result.notification);
        if (result.notification.emailStatus === NotificationEmailStatus.PENDING && result.author) {
            const delivered = await sendContributionDecisionEmail({
                to: result.author.email,
                name: result.author.name,
                termId: result.detail.id,
                word: result.detail.word,
                decision: config.status,
                message: result.message
            });
            await prisma.notification.update({
                where: { id: result.notification.id },
                data: delivered
                    ? { emailStatus: NotificationEmailStatus.SENT, emailSentAt: new Date(), emailError: null }
                    : { emailStatus: NotificationEmailStatus.FAILED, emailError: 'Falha ao enviar pelo provedor configurado.' }
            });
        }
    }

    // After commit: the term is now APPROVED, so badge conditions see the new state.
    if (input.action === 'APPROVE' && result.detail.authorId) {
        await evaluateBadges(result.detail.authorId).catch((error) =>
            console.error('[badges] evaluate after approval failed:', error));
    }

    return result.detail;
};

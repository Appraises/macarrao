import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

interface AuditInput {
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    before?: unknown;
    after?: unknown;
    metadata?: unknown;
}

const toJson = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

export const writeAuditLog = async (
    input: AuditInput,
    client: Pick<Prisma.TransactionClient, 'adminAuditLog'> | typeof prisma = prisma
) => client.adminAuditLog.create({
    data: {
        actorId: input.actorId || null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        ...(input.before !== undefined ? { before: toJson(input.before) } : {}),
        ...(input.after !== undefined ? { after: toJson(input.after) } : {}),
        ...(input.metadata !== undefined ? { metadata: toJson(input.metadata) } : {})
    }
});


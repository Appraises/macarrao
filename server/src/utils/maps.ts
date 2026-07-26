import { ContentStatus } from '@prisma/client';
import { cleanPlainText, isAllowedMediaUrl } from './content';

const CALLOUT_TYPES = ['Site', 'Spawn', 'Callout', 'Objective', 'Item'] as const;

export interface MapCalloutPayload {
    name: string;
    description: string | null;
    x: number;
    y: number;
    type: typeof CALLOUT_TYPES[number];
}

export interface GameMapPayload {
    gameId: string;
    name: string;
    image: string;
    tacticalImage: string | null;
    status: ContentStatus;
    archivedAt: Date | null;
    callouts: MapCalloutPayload[];
}

type ValidationResult =
    | { valid: true; data: GameMapPayload }
    | { valid: false; error: string };

export const validateMapPayload = (input: unknown): ValidationResult => {
    if (!input || typeof input !== 'object') {
        return { valid: false, error: 'Dados do mapa invalidos.' };
    }

    const body = input as Record<string, unknown>;
    const gameId = cleanPlainText(body.gameId);
    const name = cleanPlainText(body.name);
    const image = typeof body.image === 'string' ? body.image.trim() : '';
    const tacticalImage = typeof body.tacticalImage === 'string' ? body.tacticalImage.trim() : '';
    const status = typeof body.status === 'string' ? body.status : ContentStatus.PUBLISHED;

    if (!/^[0-9a-f-]{36}$/i.test(gameId)) {
        return { valid: false, error: 'Selecione um jogo valido.' };
    }
    if (name.length < 2 || name.length > 100) {
        return { valid: false, error: 'O nome do mapa deve ter entre 2 e 100 caracteres.' };
    }
    if (!image || image.length > 2048 || !isAllowedMediaUrl(image, ['maps'])) {
        return { valid: false, error: 'A imagem principal do mapa e invalida.' };
    }
    if (tacticalImage && (tacticalImage.length > 2048 || !isAllowedMediaUrl(tacticalImage, ['maps']))) {
        return { valid: false, error: 'A imagem tatica do mapa e invalida.' };
    }
    if (!Object.values(ContentStatus).includes(status as ContentStatus)) {
        return { valid: false, error: 'Status de mapa invalido.' };
    }
    if (!Array.isArray(body.callouts) || body.callouts.length > 500) {
        return { valid: false, error: 'Os callouts devem ser uma lista com no maximo 500 itens.' };
    }

    const callouts: MapCalloutPayload[] = [];
    for (const [index, rawCallout] of body.callouts.entries()) {
        if (!rawCallout || typeof rawCallout !== 'object') {
            return { valid: false, error: `Callout ${index + 1} invalido.` };
        }

        const callout = rawCallout as Record<string, unknown>;
        const calloutName = cleanPlainText(callout.name);
        const description = cleanPlainText(callout.description);
        const x = typeof callout.x === 'number' ? callout.x : Number(callout.x);
        const y = typeof callout.y === 'number' ? callout.y : Number(callout.y);
        const type = cleanPlainText(callout.type) as MapCalloutPayload['type'];

        if (calloutName.length < 1 || calloutName.length > 80) {
            return { valid: false, error: `O nome do callout ${index + 1} e invalido.` };
        }
        if (description.length > 500) {
            return { valid: false, error: `A descricao do callout ${index + 1} e muito longa.` };
        }
        if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 100 || y < 0 || y > 100) {
            return { valid: false, error: `As coordenadas do callout ${index + 1} devem estar entre 0 e 100.` };
        }
        if (!CALLOUT_TYPES.includes(type)) {
            return { valid: false, error: `O tipo do callout ${index + 1} e invalido.` };
        }

        callouts.push({
            name: calloutName,
            description: description || null,
            x,
            y,
            type
        });
    }

    const normalizedStatus = status as ContentStatus;
    return {
        valid: true,
        data: {
            gameId,
            name,
            image,
            tacticalImage: tacticalImage || null,
            status: normalizedStatus,
            archivedAt: normalizedStatus === ContentStatus.ARCHIVED ? new Date() : null,
            callouts
        }
    };
};


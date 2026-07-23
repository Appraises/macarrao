import { ContentStatus } from '@prisma/client';
import { cleanPlainText, isAllowedMediaUrl, slugify } from './content';

export interface GamePayload {
    name: string;
    slug: string;
    genre: string;
    image: string;
    description: string | null;
    status: ContentStatus;
    archivedAt: Date | null;
}

type ValidationResult =
    | { valid: true; data: GamePayload }
    | { valid: false; error: string };

export const validateGamePayload = (input: unknown): ValidationResult => {
    if (!input || typeof input !== 'object') {
        return { valid: false, error: 'Dados do jogo invalidos.' };
    }

    const body = input as Record<string, unknown>;
    const name = cleanPlainText(body.name);
    const slug = slugify(body.slug || name);
    const genre = cleanPlainText(body.genre);
    const image = typeof body.image === 'string' ? body.image.trim() : '';
    const description = cleanPlainText(body.description);
    const status = typeof body.status === 'string' ? body.status : ContentStatus.PUBLISHED;

    if (name.length < 2 || name.length > 100) {
        return { valid: false, error: 'O nome do jogo deve ter entre 2 e 100 caracteres.' };
    }
    if (slug.length < 2) {
        return { valid: false, error: 'O slug do jogo e invalido.' };
    }
    if (genre.length < 2 || genre.length > 50) {
        return { valid: false, error: 'O genero deve ter entre 2 e 50 caracteres.' };
    }
    if (!image || image.length > 2048 || !isAllowedMediaUrl(image, ['games'])) {
        return { valid: false, error: 'A imagem deve usar uma URL HTTP(S) valida ou um upload do site.' };
    }
    if (description.length > 2000) {
        return { valid: false, error: 'A descricao deve ter no maximo 2.000 caracteres.' };
    }
    if (!Object.values(ContentStatus).includes(status as ContentStatus)) {
        return { valid: false, error: 'Status de jogo invalido.' };
    }

    const normalizedStatus = status as ContentStatus;
    return {
        valid: true,
        data: {
            name,
            slug,
            genre,
            image,
            description: description || null,
            status: normalizedStatus,
            archivedAt: normalizedStatus === ContentStatus.ARCHIVED ? new Date() : null
        }
    };
};


import { cleanPlainText, isAllowedMediaUrl } from './content';
import { validateName } from './validation';

type ValidationResult<T> = { valid: true; data: T } | { valid: false; error: string };

const hasOwn = (input: Record<string, unknown>, key: string) => Object.prototype.hasOwnProperty.call(input, key);

export interface ProfilePayload {
    name?: string;
    avatar?: string | null;
    favoriteGameId?: string | null;
    description?: string | null;
    preferences?: Record<string, boolean>;
}

const allowedPreferences = ['emailNotifications', 'publicProfile', 'showOnlineStatus'];

export const validateProfilePayload = (value: unknown): ValidationResult<ProfilePayload> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return { valid: false, error: 'Dados de perfil invalidos.' };
    }
    const input = value as Record<string, unknown>;
    const data: ProfilePayload = {};

    if (hasOwn(input, 'name')) {
        const name = cleanPlainText(input.name);
        const validation = validateName(name);
        if (!validation.valid) return { valid: false, error: validation.message };
        data.name = name;
    }
    if (hasOwn(input, 'avatar')) {
        const avatar = cleanPlainText(input.avatar);
        if (avatar && !isAllowedMediaUrl(avatar)) return { valid: false, error: 'A URL do avatar deve usar HTTP ou HTTPS.' };
        if (avatar.length > 500) return { valid: false, error: 'A URL do avatar e muito longa.' };
        data.avatar = avatar || null;
    }
    if (hasOwn(input, 'favoriteGameId')) {
        const favoriteGameId = cleanPlainText(input.favoriteGameId);
        if (favoriteGameId.length > 100) return { valid: false, error: 'Jogo favorito invalido.' };
        data.favoriteGameId = favoriteGameId || null;
    }
    if (hasOwn(input, 'description')) {
        const description = cleanPlainText(input.description);
        if (description.length > 500) return { valid: false, error: 'A descricao deve ter no maximo 500 caracteres.' };
        data.description = description || null;
    }
    if (hasOwn(input, 'preferences')) {
        if (!input.preferences || typeof input.preferences !== 'object' || Array.isArray(input.preferences)) {
            return { valid: false, error: 'Preferencias invalidas.' };
        }
        const entries = Object.entries(input.preferences as Record<string, unknown>);
        if (entries.some(([key, preference]) => !allowedPreferences.includes(key) || typeof preference !== 'boolean')) {
            return { valid: false, error: 'Preferencias contem campos nao permitidos.' };
        }
        data.preferences = Object.fromEntries(entries) as Record<string, boolean>;
    }

    if (Object.keys(data).length === 0) return { valid: false, error: 'Informe ao menos um campo para atualizar.' };
    return { valid: true, data };
};

export const validateCommentPayload = (value: unknown): ValidationResult<{ content: string; newsId: string }> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { valid: false, error: 'Comentario invalido.' };
    const input = value as Record<string, unknown>;
    const content = cleanPlainText(input.content);
    const newsId = cleanPlainText(input.newsId);
    if (content.length < 2) return { valid: false, error: 'O comentario deve ter pelo menos 2 caracteres.' };
    if (content.length > 1000) return { valid: false, error: 'O comentario deve ter no maximo 1000 caracteres.' };
    if (!newsId || newsId.length > 100) return { valid: false, error: 'Noticia invalida.' };
    return { valid: true, data: { content, newsId } };
};

export const normalizeTextList = (
    value: unknown,
    label: string,
    limits: { maxItems: number; maxLength: number }
): ValidationResult<string[]> => {
    if (value === undefined || value === null) return { valid: true, data: [] };
    if (!Array.isArray(value)) return { valid: false, error: `${label} deve ser uma lista.` };
    if (value.length > limits.maxItems) return { valid: false, error: `${label} aceita no maximo ${limits.maxItems} itens.` };
    const items = value.map(cleanPlainText).filter(Boolean);
    if (items.some((item) => item.length > limits.maxLength)) {
        return { valid: false, error: `Cada item de ${label} deve ter no maximo ${limits.maxLength} caracteres.` };
    }
    return { valid: true, data: [...new Set(items)] };
};

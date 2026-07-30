import axios from 'axios';
import {
    TURNSTILE_ALLOWED_HOSTNAMES,
    TURNSTILE_ENABLED,
    TURNSTILE_SECRET_KEY,
    TURNSTILE_TIMEOUT_MS,
} from '../utils/config';

export type TurnstileAction = 'register' | 'contribution';

interface TurnstileResponse {
    success?: boolean;
    hostname?: string;
    action?: string;
    'error-codes'?: string[];
}

export class TurnstileVerificationError extends Error {
    constructor(
        public readonly kind: 'INVALID' | 'UNAVAILABLE' | 'MISCONFIGURED',
        message: string,
    ) {
        super(message);
    }
}

export const validateTurnstileResponse = (
    data: TurnstileResponse,
    expectedAction: TurnstileAction,
    allowedHostnames = TURNSTILE_ALLOWED_HOSTNAMES,
) => {
    const hostname = data.hostname?.trim().toLowerCase();
    const hostnameAllowed = Boolean(hostname && allowedHostnames.includes(hostname));
    if (!data.success || data.action !== expectedAction || !hostnameAllowed) {
        throw new TurnstileVerificationError('INVALID', 'A verificacao expirou ou nao foi aceita. Tente novamente.');
    }
    return hostname;
};

export const verifyTurnstileToken = async (input: {
    token: unknown;
    action: TurnstileAction;
    remoteIp?: string;
}) => {
    if (!TURNSTILE_ENABLED) return { skipped: true as const };
    if (!TURNSTILE_SECRET_KEY) {
        throw new TurnstileVerificationError('MISCONFIGURED', 'Protecao anti-bot indisponivel.');
    }
    if (typeof input.token !== 'string' || !input.token.trim() || input.token.length > 2048) {
        throw new TurnstileVerificationError('INVALID', 'Conclua a verificacao de seguranca para continuar.');
    }

    const body = new URLSearchParams({
        secret: TURNSTILE_SECRET_KEY,
        response: input.token.trim(),
    });
    if (input.remoteIp) body.set('remoteip', input.remoteIp);

    let data: TurnstileResponse;
    try {
        const response = await axios.post<TurnstileResponse>(
            'https://challenges.cloudflare.com/turnstile/v0/siteverify',
            body.toString(),
            {
                timeout: TURNSTILE_TIMEOUT_MS,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            },
        );
        data = response.data;
    } catch {
        throw new TurnstileVerificationError(
            'UNAVAILABLE',
            'A verificacao de seguranca esta temporariamente indisponivel. Tente novamente.',
        );
    }

    const hostname = validateTurnstileResponse(data, input.action);

    return { skipped: false as const, hostname };
};

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
    consumeContributionIpAttempt,
    contributionProtectionStatus,
    markBotVerified,
} from './abuseProtection';
import { TurnstileVerificationError, verifyTurnstileToken } from './turnstile';

const challengeResponse = {
    code: 'BOT_CHALLENGE_REQUIRED',
    error: 'Confirme a verificacao de seguranca para continuar.',
};

export const enforceContributionProtection = async (req: AuthRequest, res: Response) => {
    const ipLimit = await consumeContributionIpAttempt(req.ip || 'unknown');
    if (!ipLimit.allowed) {
        res.setHeader('Retry-After', String(ipLimit.retryAfterSeconds));
        res.status(429).json({
            code: 'CONTRIBUTION_IP_RATE_LIMITED',
            error: 'Muitas tentativas de contribuicao nesta rede. Aguarde e tente novamente.',
            retryAfter: ipLimit.retryAfterSeconds,
        });
        return false;
    }

    const status = await contributionProtectionStatus(req.user);
    if (!status.challengeRequired) return true;
    if (typeof req.body?.turnstileToken !== 'string' || !req.body.turnstileToken.trim()) {
        res.status(428).json(challengeResponse);
        return false;
    }

    try {
        await verifyTurnstileToken({
            token: req.body.turnstileToken,
            action: 'contribution',
            remoteIp: req.ip,
        });
        await markBotVerified(req.user.id);
        return true;
    } catch (error) {
        if (error instanceof TurnstileVerificationError) {
            const statusCode = error.kind === 'UNAVAILABLE' || error.kind === 'MISCONFIGURED' ? 503 : 400;
            res.status(statusCode).json({
                code: error.kind === 'INVALID' ? 'BOT_CHALLENGE_FAILED' : 'BOT_CHALLENGE_UNAVAILABLE',
                error: error.message,
            });
            return false;
        }
        throw error;
    }
};

export const publicContributionProtectionStatus = async (user: AuthRequest['user']) => {
    const status = await contributionProtectionStatus(user);
    return {
        enabled: status.enabled,
        challengeRequired: status.challengeRequired,
        reason: status.reason,
        trustExpiresAt: status.trustExpiresAt?.toISOString() || null,
    };
};

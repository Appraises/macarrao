import { Router } from 'express';
import * as Sentry from '@sentry/node';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma';
import { JWT_SECRET, PRIVACY_VERSION, TERMS_VERSION, TURNSTILE_ENABLED } from '../utils/config';
import { validateEmail, validatePassword, validateName } from '../utils/validation';
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/email';
import { recordUserActivity } from '../services/analytics/activity';
import { TurnstileVerificationError, verifyTurnstileToken } from '../services/turnstile';

const router = Router();

const emailActionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' }
});

/**
 * Credential endpoints get their own budget. The global limiter is 100 requests per
 * 15 minutes across the whole API, which a normal page load spends on legitimate
 * traffic while still leaving an attacker plenty of password guesses. Counting only
 * failures means someone signing in normally never hits this.
 */
/** Never log the address itself — enough to correlate attempts, not to build a list. */
const maskEmail = (email: unknown): string => {
    if (typeof email !== 'string' || !email.includes('@')) return '(invalido)';
    const [local, domain] = email.split('@');
    return `${local.slice(0, 2)}***@${domain}`;
};

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Hitting this limit is the moment an attack becomes visible, so it raises a real
    // signal instead of quietly returning 429 into the void.
    handler: (req, res) => {
        console.warn(`[auth] limite de login atingido ip=${req.ip} email=${maskEmail(req.body?.email)}`);
        Sentry.captureMessage('Limite de tentativas de login atingido', {
            level: 'warning',
            tags: { area: 'auth' },
            extra: { ip: req.ip, email: maskEmail(req.body?.email) }
        });
        res.status(429).json({ error: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.' });
    }
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Muitas contas criadas a partir deste endereco. Tente novamente mais tarde.' }
});

/**
 * A dummy hash to compare against when the email has no account. Without it the
 * request returns before bcrypt ever runs, and the ~100ms difference tells an
 * attacker which emails are registered even though both answers say the same thing.
 */
const TIMING_EQUALIZER_HASH = bcrypt.hashSync('timing-equalizer-not-a-real-password', 10);

const hashToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex');
const newToken = (lifetimeMs: number) => {
    const token = crypto.randomBytes(32).toString('hex');
    return {
        token,
        hash: hashToken(token),
        expiresAt: new Date(Date.now() + lifetimeMs)
    };
};

const normalizeEmail = (email: string): string => email.trim().toLowerCase();
const publicUser = <T extends Record<string, any>>(user: T) => {
    const {
        password: _password,
        verificationToken: _verificationToken,
        verificationTokenExpires: _verificationTokenExpires,
        resetPasswordToken: _resetPasswordToken,
        resetPasswordExpires: _resetPasswordExpires,
        sessionVersion: _sessionVersion,
        botVerifiedAt: _botVerifiedAt,
        ...safeUser
    } = user;
    return safeUser;
};

router.post('/login', loginLimiter, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha sao obrigatorios.' });
    }
    if (typeof email !== 'string' || !validateEmail(email)) {
        return res.status(400).json({ error: 'Formato de email invalido.' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
        // Always spend the bcrypt time, even with no account, so the response takes the
        // same shape whether or not the email exists.
        const passwordMatches = await bcrypt.compare(password, user?.password ?? TIMING_EQUALIZER_HASH);
        // An account erased under LGPD must not authenticate at all. The token middleware
        // already refuses these, so a login here handed back a working-looking session
        // plus the account record, and only the next request revealed it was dead.
        if (!user || !passwordMatches || user.anonymizedAt || user.email.endsWith('@system.dicionariogamer.invalid')) {
            // Without this line a credential-stuffing run leaves no trace at all: only
            // successful logins were ever recorded, so nobody could see 500 failures.
            console.warn(`[auth] login falhou ip=${req.ip} email=${maskEmail(email)}`);
            return res.status(401).json({ error: 'Credenciais invalidas.' });
        }

        const token = jwt.sign({ userId: user.id, role: user.role, sessionVersion: user.sessionVersion }, JWT_SECRET, { expiresIn: '1d' });
        await recordUserActivity(user.id, 'LOGIN');
        res.json({ token, user: publicUser(user) });
    } catch {
        res.status(500).json({ error: 'Falha ao fazer login.' });
    }
});

router.post('/register', registerLimiter, async (req, res) => {
    const { name, email, password, acceptTerms } = req.body;
    const nameCheck = validateName(name);
    if (!nameCheck.valid) return res.status(400).json({ error: nameCheck.message });
    if (typeof email !== 'string' || !validateEmail(email)) {
        return res.status(400).json({ error: 'Formato de email invalido.' });
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) return res.status(400).json({ error: passwordCheck.message });
    if (acceptTerms !== true) {
        return res.status(400).json({ error: 'Voce precisa aceitar os Termos de Uso e confirmar a leitura da Politica de Privacidade.' });
    }

    try {
        const turnstile = await verifyTurnstileToken({
            token: req.body?.turnstileToken,
            action: 'register',
            remoteIp: req.ip,
        });
        const verification = newToken(24 * 60 * 60 * 1000);
        const acceptedAt = new Date();
        const user = await prisma.user.create({
            data: {
                name: name.trim(),
                email: normalizeEmail(email),
                password: await bcrypt.hash(password, 10),
                // No avatar: the UI draws a gradient identicon from the name locally.
                // The old default embedded the person's real name in a third-party URL,
                // so every render would have announced them to ui-avatars.com.
                avatar: null,
                verificationToken: verification.hash,
                verificationTokenExpires: verification.expiresAt,
                termsAcceptedAt: acceptedAt,
                termsVersion: TERMS_VERSION,
                privacyAcknowledgedAt: acceptedAt,
                privacyVersion: PRIVACY_VERSION,
                botVerifiedAt: TURNSTILE_ENABLED && !turnstile.skipped ? acceptedAt : null,
            }
        });

        const emailSent = await sendVerificationEmail(user.email, user.name, verification.token);
        const token = jwt.sign({ userId: user.id, role: user.role, sessionVersion: user.sessionVersion }, JWT_SECRET, { expiresIn: '1d' });
        res.status(201).json({ token, user: publicUser(user), emailSent });
    } catch (error: any) {
        if (error instanceof TurnstileVerificationError) {
            return res.status(error.kind === 'INVALID' ? 400 : 503).json({
                code: error.kind === 'INVALID' ? 'BOT_CHALLENGE_FAILED' : 'BOT_CHALLENGE_UNAVAILABLE',
                error: error.message,
            });
        }
        if (error?.code === 'P2002') {
            return res.status(409).json({ error: 'Este email ja esta cadastrado.' });
        }
        console.error('[auth] Registration failed:', error?.message || error);
        res.status(500).json({ error: 'Falha ao criar a conta.' });
    }
});

router.post('/resend-verification', emailActionLimiter, async (req, res) => {
    const { email } = req.body;
    if (typeof email !== 'string' || !validateEmail(email)) {
        return res.status(400).json({ error: 'Formato de email invalido.' });
    }

    const genericResponse = { message: 'Se a conta existir e ainda nao estiver verificada, enviaremos um novo link.' };
    try {
        const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
        if (!user || user.emailVerified) return res.json(genericResponse);

        const verification = newToken(24 * 60 * 60 * 1000);
        await prisma.user.update({
            where: { id: user.id },
            data: {
                verificationToken: verification.hash,
                verificationTokenExpires: verification.expiresAt
            }
        });
        // Mesmo raciocinio do reset: resposta generica para nao permitir enumerar contas.
        const delivered = await sendVerificationEmail(user.email, user.name, verification.token);
        if (!delivered) console.error('[auth] Reenvio de verificacao: email nao entregue.');
        res.json(genericResponse);
    } catch (error) {
        console.error('[auth] Verification resend failed:', error);
        res.status(500).json({ error: 'Nao foi possivel processar a solicitacao.' });
    }
});

router.post('/verify-email', async (req, res) => {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Token e obrigatorio.' });
    }

    try {
        const user = await prisma.user.findFirst({
            where: {
                verificationToken: { in: [hashToken(token), token] },
                OR: [
                    { verificationTokenExpires: null },
                    { verificationTokenExpires: { gt: new Date() } }
                ]
            }
        });
        if (!user) return res.status(400).json({ error: 'Link invalido ou expirado.' });

        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                verificationToken: null,
                verificationTokenExpires: null
            }
        });
        res.json({ message: 'Email confirmado com sucesso.' });
    } catch {
        res.status(500).json({ error: 'Falha ao confirmar o email.' });
    }
});

router.post('/forgot-password', emailActionLimiter, async (req, res) => {
    const { email } = req.body;
    if (typeof email !== 'string' || !validateEmail(email)) {
        return res.status(400).json({ error: 'Formato de email invalido.' });
    }

    const genericResponse = { message: 'Se a conta existir, enviaremos um link de redefinicao.' };
    try {
        const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
        if (!user) return res.json(genericResponse);

        const reset = newToken(60 * 60 * 1000);
        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: reset.hash,
                resetPasswordExpires: reset.expiresAt
            }
        });
        // A resposta continua generica de proposito: dizer ao cliente que o envio falhou
        // revelaria que a conta existe. A falha vira sinal no servidor (log + Sentry).
        const delivered = await sendPasswordResetEmail(user.email, user.name, reset.token);
        if (!delivered) console.error('[auth] Reset de senha: token gerado, mas o email nao foi entregue.');
        res.json(genericResponse);
    } catch (error) {
        console.error('[auth] Password reset email failed:', error);
        res.status(500).json({ error: 'Nao foi possivel processar a solicitacao.' });
    }
});

router.post('/reset-password', emailActionLimiter, async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Token e obrigatorio.' });
    }

    const passwordCheck = validatePassword(newPassword);
    if (!passwordCheck.valid) return res.status(400).json({ error: passwordCheck.message });

    try {
        const user = await prisma.user.findFirst({
            where: {
                resetPasswordToken: { in: [hashToken(token), token] },
                resetPasswordExpires: { gt: new Date() }
            }
        });
        if (!user) return res.status(400).json({ error: 'Link invalido ou expirado.' });

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: await bcrypt.hash(newPassword, 10),
                resetPasswordToken: null,
                resetPasswordExpires: null,
                sessionVersion: { increment: 1 }
            }
        });
        res.json({ message: 'Senha redefinida com sucesso.' });
    } catch {
        res.status(500).json({ error: 'Falha ao redefinir a senha.' });
    }
});

export default router;

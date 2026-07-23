import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const subscribeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Muitas tentativas. Aguarde alguns minutos.' }
});

// Public newsletter opt-in. Requires explicit consent (LGPD) and is idempotent.
router.post('/subscribe', subscribeLimiter, async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const consent = req.body?.consent === true;
    const source = typeof req.body?.source === 'string' ? req.body.source.slice(0, 40) : null;

    if (!EMAIL_RE.test(email) || email.length > 254) {
        return res.status(400).json({ error: 'Informe um e-mail válido.' });
    }
    if (!consent) {
        return res.status(400).json({ error: 'É necessário concordar em receber os e-mails.' });
    }

    try {
        // Re-subscribing clears a previous opt-out; an existing subscription is a no-op.
        await prisma.newsletterSubscriber.upsert({
            where: { email },
            update: { unsubscribedAt: null },
            create: { email, source, consentAt: new Date() }
        });
        res.status(201).json({ ok: true });
    } catch (error) {
        console.error('[newsletter] Subscribe failed:', error);
        res.status(500).json({ error: 'Falha ao inscrever. Tente novamente.' });
    }
});

export default router;

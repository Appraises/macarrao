import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { APP_URL } from '../utils/config';
import {
    NewsletterError,
    confirmNewsletterSubscription,
    recordNewsletterClick,
    requestNewsletterSubscription,
    resendNewsletterConfirmation,
    unsubscribeNewsletter,
} from '../services/newsletter';

const router = Router();
const generic = { message: 'Se o endereço puder receber a newsletter, enviaremos uma confirmação.' };
const actionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Muitas tentativas. Aguarde alguns minutos.' },
});
const unsubscribeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Muitas tentativas. Aguarde alguns minutos.' },
});

router.post('/subscribe', actionLimiter, async (req, res) => {
    if (req.body?.consent !== true) return res.status(400).json({ error: 'É necessário concordar em receber os e-mails.' });
    try {
        await requestNewsletterSubscription(req.body?.email, req.body?.source);
        res.status(202).json(generic);
    } catch (error) {
        if (error instanceof NewsletterError) return res.status(error.status).json({ error: error.message });
        console.error('[newsletter] Subscribe failed:', error);
        res.status(500).json({ error: 'Falha ao processar a inscrição.' });
    }
});

router.post('/resend-confirmation', actionLimiter, async (req, res) => {
    try {
        await resendNewsletterConfirmation(req.body?.email);
        res.json(generic);
    } catch (error) {
        console.error('[newsletter] Resend confirmation failed:', error);
        res.json(generic);
    }
});

router.post('/confirm', actionLimiter, async (req, res) => {
    try {
        res.json(await confirmNewsletterSubscription(req.body?.token));
    } catch (error) {
        if (error instanceof NewsletterError) return res.status(error.status).json({ error: error.message });
        console.error('[newsletter] Confirmation failed:', error);
        res.status(500).json({ error: 'Falha ao confirmar a inscrição.' });
    }
});

router.post('/unsubscribe', unsubscribeLimiter, async (req, res) => {
    try {
        await unsubscribeNewsletter(req.query.token ?? req.body?.token);
        res.json({ unsubscribed: true });
    } catch (error) {
        console.error('[newsletter] Unsubscribe failed:', error);
        res.status(500).json({ error: 'Falha ao processar o descadastro.' });
    }
});

router.get('/click/:token', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
        res.redirect(302, await recordNewsletterClick(req.params.token));
    } catch (error) {
        console.error('[newsletter] Click tracking failed:', error);
        res.redirect(302, `${APP_URL}/dicionario`);
    }
});

export default router;

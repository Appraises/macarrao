import { Request, Response } from 'express';
import { WebhookRetryableError, processNewsletterWebhook, verifyNewsletterWebhook } from '../services/newsletterWebhook';

export const resendWebhook = async (req: Request, res: Response) => {
    const id = req.header('svix-id');
    const timestamp = req.header('svix-timestamp');
    const signature = req.header('svix-signature');
    if (!id || !timestamp || !signature || !Buffer.isBuffer(req.body)) {
        return res.status(400).json({ error: 'Webhook inválido.' });
    }
    let event: any;
    try {
        event = verifyNewsletterWebhook(req.body.toString('utf8'), { id, timestamp, signature });
    } catch (error) {
        console.error('[resend-webhook] Rejected:', error instanceof Error ? error.message : 'invalid');
        return res.status(400).json({ error: 'Assinatura inválida.' });
    }
    try {
        await processNewsletterWebhook(id, event);
        res.sendStatus(200);
    } catch (error) {
        // Any non-2xx makes Resend redeliver later; the event row was rolled back.
        const retryable = error instanceof WebhookRetryableError;
        if (!retryable) console.error('[resend-webhook] Processing failed:', error instanceof Error ? error.message : error);
        res.status(503).json({ error: 'Evento não processado; tente novamente.' });
    }
};

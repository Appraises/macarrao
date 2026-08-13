import { Request, Response } from 'express';
import { processNewsletterWebhook, verifyNewsletterWebhook } from '../services/newsletterWebhook';

export const resendWebhook = async (req: Request, res: Response) => {
    const id = req.header('svix-id');
    const timestamp = req.header('svix-timestamp');
    const signature = req.header('svix-signature');
    if (!id || !timestamp || !signature || !Buffer.isBuffer(req.body)) {
        return res.status(400).json({ error: 'Webhook inválido.' });
    }
    try {
        const event = verifyNewsletterWebhook(req.body.toString('utf8'), { id, timestamp, signature });
        await processNewsletterWebhook(id, event);
        res.sendStatus(200);
    } catch (error) {
        console.error('[resend-webhook] Rejected:', error instanceof Error ? error.message : 'invalid');
        res.status(400).json({ error: 'Assinatura inválida.' });
    }
};

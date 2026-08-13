import * as Sentry from '@sentry/node';
import { Resend } from 'resend';
import { APP_URL, EMAIL_FROM, PUBLIC_API_URL, RESEND_API_KEY } from '../utils/config';
import { EmailContent, emailShell, escapeHtml } from './email';

export interface NewsletterTermSnapshot {
    word: string;
    definition: string;
    example?: string | null;
    game?: string | null;
    tags: string[];
}

export interface NewsletterRecipientMessage {
    deliveryId: string;
    to: string;
    clickToken: string;
    unsubscribeToken: string;
}

export interface NewsletterBatchResult {
    ids: Array<{ index: number; id: string }>;
    errors: Array<{ index: number; message: string }>;
    requestError?: string;
}

const client = () => RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
export const sanitizeNewsletterProviderError = (value: unknown): string => {
    const message = value instanceof Error ? value.message : String(value ?? 'Falha desconhecida.');
    return message
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
        .replace(/https?:\/\/[^\s"'<>]+/gi, '[url]')
        .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, '[identificador]')
        .replace(/\b(?:re_|whsec_)[A-Za-z0-9_-]+\b/g, '[segredo]')
        .replace(/([?&](?:token|key|signature)=)[^\s&]+/gi, '$1[segredo]')
        .slice(0, 500);
};
const report = (message: string, cause?: unknown) => {
    const safeMessage = sanitizeNewsletterProviderError(cause || message);
    console.error(`[newsletter-email] ${message}: ${safeMessage}`);
    Sentry.captureMessage(`[newsletter-email] ${safeMessage}`, { level: 'error', tags: { emailKind: 'newsletter' } });
};

export const renderNewsletterConfirmationEmail = (token: string): EmailContent => {
    const url = `${APP_URL}/newsletter/confirmar?token=${encodeURIComponent(token)}`;
    return {
        subject: 'Confirme o Termo do Dia - Dicionário Gamer',
        html: emailShell({
            heading: 'Confirme sua inscrição',
            message: 'Confirme este endereço para começar a receber uma palavra do universo gamer por dia.',
            buttonLabel: 'Confirmar inscrição',
            url,
            preheader: 'Confirme seu e-mail para receber o Termo do Dia.',
            highlight: 'O link é válido por 24 horas. Nenhuma newsletter será enviada antes da confirmação.',
            securityNote: 'Se você não pediu esta inscrição, ignore a mensagem. Seu endereço continuará fora da lista.',
        }),
        text: `Confirme sua inscrição no Termo do Dia:\n${url}\n\nO link é válido por 24 horas. Se você não pediu esta inscrição, ignore esta mensagem.`,
    };
};

const dailyContent = (input: {
    term: NewsletterTermSnapshot;
    clickUrl: string;
    unsubscribeUrl: string;
    test?: boolean;
}): EmailContent => {
    const context = [input.term.game, ...input.term.tags.slice(0, 3)].filter(Boolean).join(' · ');
    const shortDefinition = input.term.definition.length > 320
        ? `${input.term.definition.slice(0, 317).trimEnd()}...`
        : input.term.definition;
    const shortExample = input.term.example && input.term.example.length > 180
        ? `${input.term.example.slice(0, 177).trimEnd()}...`
        : input.term.example;
    const detail = [context, shortExample ? `“${shortExample}”` : ''].filter(Boolean).join(' — ');
    const safeUnsubscribe = escapeHtml(input.unsubscribeUrl);
    const html = emailShell({
        heading: input.term.word,
        message: shortDefinition,
        buttonLabel: 'Ver termo completo',
        url: input.clickUrl,
        preheader: `${input.term.word}: ${shortDefinition}`.slice(0, 140),
        highlight: detail || 'Descubra como a comunidade usa este termo.',
        footerHtml: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0;"><tr><td style="border-top:1px solid #E2E8F0;padding:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#64748B;">${input.test ? 'Esta é uma prévia administrativa; nenhum inscrito recebeu esta mensagem.' : `Você recebe esta mensagem porque confirmou o Termo do Dia. <a href="${safeUnsubscribe}" style="color:#0369A1;">Descadastrar meu e-mail</a>.`}</td></tr></table>`,
    });
    const suffix = input.test
        ? 'Esta é uma prévia administrativa.'
        : `Não quer mais receber? Descadastre-se em ${input.unsubscribeUrl}`;
    return {
        subject: `${input.test ? '[TESTE] ' : ''}${input.term.word} - Termo do Dia`,
        html,
        text: `${input.term.word}\n\n${shortDefinition}${detail ? `\n\n${detail}` : ''}\n\nVeja o termo: ${input.clickUrl}\n\n${suffix}`,
    };
};

export const renderNewsletterDailyEmail = dailyContent;

export const sendNewsletterConfirmationEmail = async (input: {
    subscriberId: string;
    to: string;
    token: string;
}): Promise<{ sent: boolean; emailId?: string }> => {
    const resend = client();
    if (!resend) return { sent: false };
    try {
        const content = renderNewsletterConfirmationEmail(input.token);
        const { data, error } = await resend.emails.send(
            { from: EMAIL_FROM, to: input.to, ...content, tags: [{ name: 'category', value: 'newsletter-confirmation' }] },
            { idempotencyKey: `newsletter-confirmation/${input.subscriberId}/${input.token.slice(0, 16)}` },
        );
        if (error || !data?.id) {
            report(`Confirmação recusada: ${error?.message || 'resposta sem ID'}`);
            return { sent: false };
        }
        return { sent: true, emailId: data.id };
    } catch (error) {
        report('Falha ao enviar confirmação', error);
        return { sent: false };
    }
};

export const sendNewsletterTestEmail = async (input: {
    to: string;
    term: NewsletterTermSnapshot;
}): Promise<boolean> => {
    const resend = client();
    if (!resend) return false;
    try {
        const content = dailyContent({
            term: input.term,
            clickUrl: `${APP_URL}/term/${encodeURIComponent(input.term.word)}`,
            unsubscribeUrl: `${APP_URL}/privacidade`,
            test: true,
        });
        const { data, error } = await resend.emails.send({
            from: EMAIL_FROM,
            to: input.to,
            ...content,
            tags: [{ name: 'category', value: 'newsletter-test' }],
        });
        if (error || !data?.id) report(`Prévia recusada: ${error?.message || 'resposta sem ID'}`);
        return Boolean(data?.id && !error);
    } catch (error) {
        report('Falha ao enviar prévia', error);
        return false;
    }
};

export const sendNewsletterBatch = async (input: {
    campaignId: string;
    dateKey: string;
    idempotencyKey: string;
    term: NewsletterTermSnapshot;
    recipients: NewsletterRecipientMessage[];
}): Promise<NewsletterBatchResult> => {
    const resend = client();
    if (!resend || !PUBLIC_API_URL) return { ids: [], errors: [], requestError: 'Provedor de e-mail não configurado.' };

    try {
        const payload = input.recipients.map((recipient) => {
            const clickUrl = `${PUBLIC_API_URL}/newsletter/click/${encodeURIComponent(recipient.clickToken)}`;
            const unsubscribeUrl = `${APP_URL}/newsletter/descadastrar?token=${encodeURIComponent(recipient.unsubscribeToken)}`;
            const oneClickUrl = `${PUBLIC_API_URL}/newsletter/unsubscribe?token=${encodeURIComponent(recipient.unsubscribeToken)}`;
            const content = dailyContent({ term: input.term, clickUrl, unsubscribeUrl });
            return {
                from: EMAIL_FROM,
                to: recipient.to,
                ...content,
                headers: {
                    'List-Unsubscribe': `<${oneClickUrl}>`,
                    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
                },
                tags: [
                    { name: 'category', value: 'newsletter-daily' },
                    { name: 'campaign', value: input.dateKey },
                ],
            };
        });
        const { data, error } = await resend.batch.send(payload, {
            idempotencyKey: input.idempotencyKey,
            batchValidation: 'permissive',
        });
        if (error || !data) {
            const message = sanitizeNewsletterProviderError(error?.message || 'Resposta sem dados do provedor.');
            report(`Lote recusado: ${message}`);
            return { ids: [], errors: [], requestError: message };
        }
        const failures = new Map((data.errors || []).map((item) => [item.index, item.message]));
        const ids: Array<{ index: number; id: string }> = [];
        let successIndex = 0;
        for (let index = 0; index < input.recipients.length; index += 1) {
            if (failures.has(index)) continue;
            const result = data.data[successIndex++];
            if (result?.id) ids.push({ index, id: result.id });
        }
        return { ids, errors: [...failures].map(([index, message]) => ({ index, message: sanitizeNewsletterProviderError(message) })) };
    } catch (error) {
        report('Falha inesperada no lote', error);
        return { ids: [], errors: [], requestError: sanitizeNewsletterProviderError(error) };
    }
};

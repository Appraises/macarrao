import * as Sentry from '@sentry/node';
import { Resend } from 'resend';
import { APP_URL, EMAIL_FROM, RESEND_API_KEY } from '../utils/config';

/** Which message failed. Kept coarse on purpose: never attach recipients to telemetry. */
export type EmailKind =
    | 'verification'
    | 'password-reset'
    | 'privacy-confirmation'
    | 'privacy-status'
    | 'contribution-decision';

export const escapeHtml = (value: string): string => value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
}[character] || character));

const getClient = (): Resend | null => RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// A dead email channel used to be invisible: callers that ignored the boolean turned a
// failed delivery into total silence. Reporting here means every failure raises a signal,
// regardless of whether the caller inspects the result. Recipients are never sent to Sentry.
const reportFailure = (kind: EmailKind, reason: string, cause?: unknown): false => {
    console.error(`[email] ${kind} nao entregue: ${reason}`, cause instanceof Error ? cause.message : cause ?? '');
    if (cause instanceof Error) Sentry.captureException(cause, { tags: { emailKind: kind }, extra: { reason } });
    else Sentry.captureMessage(`Email nao entregue (${kind}): ${reason}`, { level: 'error', tags: { emailKind: kind } });
    return false;
};

const send = async (kind: EmailKind, input: { to: string; subject: string; html: string; text: string }): Promise<boolean> => {
    const resend = getClient();
    if (!resend) return reportFailure(kind, 'RESEND_API_KEY nao esta configurada');

    try {
        const { error } = await resend.emails.send({ from: EMAIL_FROM, ...input });
        if (error) return reportFailure(kind, `Resend recusou a mensagem: ${error.message}`);
        return true;
    } catch (error) {
        return reportFailure(kind, 'Falha inesperada ao enviar', error);
    }
};

/* -------------------------------------------------------------------------- */
/* Template                                                                    */
/* -------------------------------------------------------------------------- */

// Palette. Light background on purpose: many clients drop <body> backgrounds, and a
// dark shell would leave light text on white — unreadable. The button uses a darker
// shade of the brand blue so white label text keeps AA contrast.
const PAGE_BG = '#EEF2F6';
const CARD_BG = '#FFFFFF';
const BORDER = '#E2E8F0';
const BRAND = '#0EA5E9';
const BUTTON_BG = '#0369A1';
const TEXT = '#0F172A';
const TEXT_SOFT = '#475569';
const TEXT_MUTED = '#94A3B8';
const HIGHLIGHT_BG = '#F0F9FF';
const HIGHLIGHT_TEXT = '#0C4A6E';

const FONT = 'Arial, Helvetica, sans-serif';

export interface EmailContent { subject: string; html: string; text: string }

interface ShellOptions {
    name?: string;
    heading: string;
    message: string;
    buttonLabel: string;
    url: string;
    /** Inbox preview line. Without it clients scrape whatever text comes first. */
    preheader: string;
    /** Optional callout, e.g. how long the link lasts. */
    highlight?: string;
    /** Optional reassurance shown under the divider. */
    securityNote?: string;
    /** Trusted template fragment for legal/operational footer links. */
    footerHtml?: string;
}

// Table-based layout: Outlook (Word engine) ignores max-width on divs, so the width
// lives on a <table width="600">. The button ships a VML fallback for the same reason.
export const emailShell = ({ name, heading, message, buttonLabel, url, preheader, highlight, securityNote, footerHtml }: ShellOptions): string => {
    const safeUrl = escapeHtml(url);
    return `<!doctype html>
<html lang="pt-BR" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(heading)}</title>
<!--[if mso]>
<xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
<![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${PAGE_BG};">
<div style="display:none;font-size:1px;color:${PAGE_BG};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}&#8203;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${PAGE_BG};">
<tr>
<td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
<tr>
<td style="padding:4px 4px 16px;font-family:${FONT};font-size:13px;font-weight:bold;letter-spacing:2px;color:${BRAND};text-transform:uppercase;">Dicionário Gamer</td>
</tr>
<tr>
<td style="background-color:${CARD_BG};border:1px solid ${BORDER};border-radius:10px;padding:32px 30px;">
<h1 style="margin:0 0 18px;font-family:${FONT};font-size:24px;line-height:1.3;color:${TEXT};">${escapeHtml(heading)}</h1>
${name ? `<p style="margin:0 0 14px;font-family:${FONT};font-size:15px;line-height:1.6;color:${TEXT};">Olá, ${escapeHtml(name)}.</p>` : ''}
<p style="margin:0 0 22px;font-family:${FONT};font-size:15px;line-height:1.6;color:${TEXT_SOFT};">${escapeHtml(message)}</p>
${highlight ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
<tr><td style="background-color:${HIGHLIGHT_BG};border-left:3px solid ${BRAND};padding:12px 14px;font-family:${FONT};font-size:14px;line-height:1.5;color:${HIGHLIGHT_TEXT};">${escapeHtml(highlight)}</td></tr>
</table>` : ''}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px;">
<tr><td align="center">
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeUrl}" style="height:46px;v-text-anchor:middle;width:280px;" arcsize="13%" strokecolor="${BUTTON_BG}" fillcolor="${BUTTON_BG}">
<w:anchorlock/>
<center style="color:#ffffff;font-family:${FONT};font-size:15px;font-weight:bold;">${escapeHtml(buttonLabel)}</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-- -->
<a href="${safeUrl}" style="background-color:${BUTTON_BG};border-radius:6px;color:#ffffff;display:inline-block;font-family:${FONT};font-size:15px;font-weight:bold;line-height:46px;text-align:center;text-decoration:none;width:280px;-webkit-text-size-adjust:none;">${escapeHtml(buttonLabel)}</a>
<!--<![endif]-->
</td></tr>
</table>
<p style="margin:0 0 6px;font-family:${FONT};font-size:12px;line-height:1.5;color:${TEXT_MUTED};">Se o botão não funcionar, copie e cole este endereço no seu navegador:</p>
<p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.5;"><a href="${safeUrl}" style="color:${BUTTON_BG};word-break:break-all;">${safeUrl}</a></p>
${securityNote ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0;">
<tr><td style="border-top:1px solid ${BORDER};padding:16px 0 0;font-family:${FONT};font-size:13px;line-height:1.6;color:${TEXT_SOFT};">${escapeHtml(securityNote)}</td></tr>
</table>` : ''}
${footerHtml || ''}
</td>
</tr>
<tr>
<td style="padding:18px 4px;font-family:${FONT};font-size:12px;line-height:1.6;color:${TEXT_MUTED};">
Dicionário Gamer — o dicionário da comunidade gamer brasileira.<br>
Este é um e-mail automático, não é necessário respondê-lo.
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
};

/* -------------------------------------------------------------------------- */
/* Renderers (shared by send + preview)                                        */
/* -------------------------------------------------------------------------- */

export const renderVerificationEmail = (name: string, token: string): EmailContent => {
    const url = `${APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
    return {
        subject: 'Confirme seu e-mail no Dicionário Gamer',
        html: emailShell({
            name,
            heading: 'Confirme seu e-mail',
            message: 'Falta pouco para ativar sua conta. Use o botão abaixo para confirmar que este endereço é seu.',
            buttonLabel: 'Confirmar e-mail',
            url,
            preheader: 'Ative sua conta no Dicionário Gamer — o link vale por 24 horas.',
            highlight: 'Este link expira em 24 horas.',
            securityNote: 'Se você não criou uma conta no Dicionário Gamer, basta ignorar este e-mail.'
        }),
        text: `Olá, ${name}.\n\nConfirme seu e-mail para ativar sua conta no Dicionário Gamer:\n${url}\n\nEste link expira em 24 horas.\nSe você não criou uma conta, ignore este e-mail.`
    };
};

export const renderPasswordResetEmail = (name: string, token: string): EmailContent => {
    const url = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
    return {
        subject: 'Redefina sua senha do Dicionário Gamer',
        html: emailShell({
            name,
            heading: 'Redefinição de senha',
            message: 'Recebemos um pedido para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha.',
            buttonLabel: 'Criar nova senha',
            url,
            preheader: 'Seu link para criar uma nova senha expira em 1 hora.',
            highlight: 'Por segurança, este link expira em 1 hora e só pode ser usado uma vez.',
            securityNote: 'Se você não pediu para redefinir a senha, ignore este e-mail: sua senha atual continua valendo e nenhuma alteração foi feita na sua conta.'
        }),
        text: `Olá, ${name}.\n\nRecebemos um pedido para redefinir a senha da sua conta no Dicionário Gamer. Crie uma nova senha em:\n${url}\n\nPor segurança, este link expira em 1 hora e só pode ser usado uma vez.\n\nSe você não pediu para redefinir a senha, ignore este e-mail: sua senha atual continua valendo.`
    };
};

export const renderPrivacyRequestConfirmationEmail = (name: string, protocol: string, token: string): EmailContent => {
    const url = `${APP_URL}/settings?privacyToken=${encodeURIComponent(token)}`;
    return {
        subject: `Confirme sua solicitação LGPD ${protocol}`,
        html: emailShell({
            name,
            heading: 'Confirme sua solicitação',
            message: `Recebemos a solicitação ${protocol}. Confirme o pedido para que nossa equipe possa iniciá-lo.`,
            buttonLabel: 'Confirmar solicitação',
            url,
            preheader: `Confirme a solicitação ${protocol} para darmos andamento.`,
            highlight: 'Este link vale por 24 horas.'
        }),
        text: `Olá, ${name}.\n\nConfirme a solicitação ${protocol} em:\n${url}\n\nO link vale por 24 horas.`
    };
};

export const renderPrivacyRequestStatusEmail = (name: string, protocol: string, status: string, message: string): EmailContent => {
    const url = `${APP_URL}/settings`;
    return {
        subject: `Atualização da solicitação LGPD ${protocol}`,
        html: emailShell({
            name,
            heading: `Solicitação ${status}`,
            message: `${message} Protocolo: ${protocol}.`,
            buttonLabel: 'Acompanhar solicitação',
            url,
            preheader: `Sua solicitação ${protocol} teve uma atualização.`
        }),
        text: `Olá, ${name}. ${message} Protocolo: ${protocol}. Estado: ${status}.\n\nAcompanhe em ${url}.`
    };
};

export const renderContributionDecisionEmail = (input: {
    name: string;
    termId: string;
    word: string;
    decision: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
    message: string;
}): EmailContent => {
    const labels = {
        APPROVED: { subject: 'Contribuição aprovada', heading: 'Sua contribuição foi aprovada' },
        REJECTED: { subject: 'Atualização sobre sua contribuição', heading: 'Sua contribuição foi revisada' },
        CHANGES_REQUESTED: { subject: 'Sua contribuição precisa de ajustes', heading: 'A moderação solicitou uma revisão' }
    } as const;
    const label = labels[input.decision];
    const url = `${APP_URL}/minhas-contribuicoes/${encodeURIComponent(input.termId)}`;
    return {
        subject: `${label.subject} — Dicionário Gamer`,
        html: emailShell({
            name: input.name,
            heading: label.heading,
            message: `${input.word}: ${input.message}`,
            buttonLabel: 'Ver contribuição',
            url,
            preheader: `${label.subject}: ${input.word}.`
        }),
        text: `Olá, ${input.name}.\n\n${input.word}: ${input.message}\n\nAcompanhe em ${url}.`
    };
};

/* -------------------------------------------------------------------------- */
/* Senders                                                                     */
/* -------------------------------------------------------------------------- */

export const sendVerificationEmail = (to: string, name: string, token: string): Promise<boolean> =>
    send('verification', { to, ...renderVerificationEmail(name, token) });

export const sendPasswordResetEmail = (to: string, name: string, token: string): Promise<boolean> =>
    send('password-reset', { to, ...renderPasswordResetEmail(name, token) });

export const sendPrivacyRequestConfirmationEmail = (to: string, name: string, protocol: string, token: string): Promise<boolean> =>
    send('privacy-confirmation', { to, ...renderPrivacyRequestConfirmationEmail(name, protocol, token) });

export const sendPrivacyRequestStatusEmail = (to: string, name: string, protocol: string, status: string, message: string): Promise<boolean> =>
    send('privacy-status', { to, ...renderPrivacyRequestStatusEmail(name, protocol, status, message) });

export const sendContributionDecisionEmail = (input: {
    to: string;
    name: string;
    termId: string;
    word: string;
    decision: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
    message: string;
}): Promise<boolean> => send('contribution-decision', { to: input.to, ...renderContributionDecisionEmail(input) });

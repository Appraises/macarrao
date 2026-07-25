import { describe, expect, it, vi } from 'vitest';

// The senders are not exercised here (no network in tests); the renderers are pure
// and are what actually decides what lands in someone's inbox.
vi.mock('../src/utils/config', () => ({
    APP_URL: 'https://dicionariogamer.test',
    EMAIL_FROM: 'Dicionario Gamer <no-reply@dicionariogamer.test>',
    RESEND_API_KEY: '',
}));

import {
    renderContributionDecisionEmail,
    renderPasswordResetEmail,
    renderPrivacyRequestConfirmationEmail,
    renderVerificationEmail,
} from '../src/services/email';

describe('email templates', () => {
    it('escapes user-controlled text instead of injecting it into the HTML', () => {
        const { html } = renderVerificationEmail('<script>alert(1)</script>', 'tok');

        expect(html).not.toContain('<script>alert(1)</script>');
        expect(html).toContain('&lt;script&gt;');
    });

    it('percent-encodes the token so it cannot break out of the href attribute', () => {
        const { html } = renderPasswordResetEmail('Bruno', 'abc"onload="alert(1)');

        // encodeURIComponent runs before the HTML is built, so the quote never
        // reaches the attribute as a literal.
        expect(html).toContain('token=abc%22onload%3D%22alert(1)');
        expect(html).not.toContain('onload="alert(1)"');
    });

    it('builds every action link from APP_URL', () => {
        expect(renderPasswordResetEmail('Bruno', 'tok').html).toContain('https://dicionariogamer.test/reset-password?token=tok');
        expect(renderVerificationEmail('Bruno', 'tok').html).toContain('https://dicionariogamer.test/verify-email?token=tok');
        expect(renderPrivacyRequestConfirmationEmail('Bruno', 'DG-1', 'tok').html)
            .toContain('https://dicionariogamer.test/settings?privacyToken=tok');
    });

    it('always ships a plain-text alternative alongside the HTML', () => {
        for (const mail of [
            renderPasswordResetEmail('Bruno', 'tok'),
            renderVerificationEmail('Bruno', 'tok'),
            renderContributionDecisionEmail({ name: 'Bruno', termId: 't1', word: 'Gank', decision: 'APPROVED', message: 'ok' }),
        ]) {
            expect(mail.subject.length).toBeGreaterThan(0);
            expect(mail.text.length).toBeGreaterThan(0);
            expect(mail.text).not.toContain('<');
        }
    });
});

describe('deliverability details that are easy to regress', () => {
    const { html } = renderPasswordResetEmail('Bruno', 'tok');

    it('declares a charset, so accented Portuguese is not mangled', () => {
        expect(html).toContain('<meta charset="utf-8">');
        expect(html).toContain('Redefinição');
    });

    it('uses a fixed-width table, because Outlook ignores max-width on divs', () => {
        expect(html).toContain('width="600"');
        expect(html).toContain('role="presentation"');
    });

    it('ships the VML button fallback for Outlook', () => {
        expect(html).toContain('v:roundrect');
        expect(html).toContain('<!--[if !mso]><!-- -->');
    });

    it('sets a preheader instead of letting clients scrape random text', () => {
        expect(html).toContain('display:none;font-size:1px');
        expect(html).toContain('expira em 1 hora');
    });

    it('repeats the link as copyable text, so a dead button never locks anyone out', () => {
        expect(html).toContain('copie e cole este endereço');
        const occurrences = html.split('https://dicionariogamer.test/reset-password?token=tok').length - 1;
        expect(occurrences).toBeGreaterThanOrEqual(2); // button + visible text
    });

    it('states that the password is unchanged when the request was not the user', () => {
        expect(html).toContain('sua senha atual continua valendo');
    });
});

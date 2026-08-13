// Renders every transactional email to .preview/emails/ so you can open them in a
// browser without sending anything. Uses the exact same renderers as the senders,
// so what you see here is what lands in the inbox.
// Run: npm run preview:emails
import { mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import {
    EmailContent,
    renderContributionDecisionEmail,
    renderPasswordResetEmail,
    renderPrivacyRequestConfirmationEmail,
    renderPrivacyRequestStatusEmail,
    renderVerificationEmail,
} from '../src/services/email';
import {
    renderNewsletterConfirmationEmail,
    renderNewsletterDailyEmail,
} from '../src/services/newsletterEmail';

const NAME = 'Bruno';
const TOKEN = 'exemplo-de-token-1234567890abcdef';

const SAMPLES: Array<{ file: string; label: string; content: EmailContent }> = [
    { file: 'password-reset.html', label: 'Recuperação de senha', content: renderPasswordResetEmail(NAME, TOKEN) },
    { file: 'verification.html', label: 'Confirmação de e-mail', content: renderVerificationEmail(NAME, TOKEN) },
    { file: 'privacy-confirmation.html', label: 'LGPD — confirmação', content: renderPrivacyRequestConfirmationEmail(NAME, 'DG-2026-0042', TOKEN) },
    { file: 'privacy-status.html', label: 'LGPD — atualização', content: renderPrivacyRequestStatusEmail(NAME, 'DG-2026-0042', 'concluída', 'Sua solicitação foi processada com sucesso.') },
    {
        file: 'contribution-approved.html', label: 'Contribuição aprovada',
        content: renderContributionDecisionEmail({ name: NAME, termId: 'abc123', word: 'Gank', decision: 'APPROVED', message: 'Obrigado! O termo já está no ar.' }),
    },
    {
        file: 'contribution-changes.html', label: 'Contribuição — ajustes',
        content: renderContributionDecisionEmail({ name: NAME, termId: 'abc123', word: 'Gank', decision: 'CHANGES_REQUESTED', message: 'Poderia adicionar um exemplo de uso?' }),
    },
    {
        file: 'newsletter-confirmation.html',
        label: 'Newsletter — confirmação',
        content: renderNewsletterConfirmationEmail(TOKEN),
    },
    {
        file: 'newsletter-daily.html',
        label: 'Newsletter — Termo do Dia',
        content: renderNewsletterDailyEmail({
            term: {
                word: 'Gank',
                definition: 'Ataque surpresa realizado por um ou mais jogadores contra um adversário em desvantagem.',
                example: 'O caçador preparou um gank na rota inferior.',
                game: 'League of Legends',
                tags: ['MOBA', 'Estratégia'],
            },
            clickUrl: 'https://dicionariogamer.com.br/term/Gank',
            unsubscribeUrl: `https://dicionariogamer.com.br/newsletter/descadastrar?token=${TOKEN}`,
        }),
    },
];

const outDir = resolve(__dirname, '..', '.preview', 'emails');
mkdirSync(outDir, { recursive: true });

for (const sample of SAMPLES) {
    writeFileSync(join(outDir, sample.file), sample.content.html, 'utf8');
}

// Index with the subject/plain-text of each message, so the copy is reviewable too.
const index = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Preview de e-mails</title>
<style>
body{margin:0;padding:32px;background:#0f172a;color:#e2e8f0;font:15px/1.6 system-ui,sans-serif}
h1{font-size:20px;margin:0 0 24px}
a{color:#38bdf8}
li{margin:0 0 20px}
code{display:block;white-space:pre-wrap;background:#1e293b;padding:10px 12px;border-radius:6px;color:#94a3b8;font-size:12px;margin-top:6px}
</style></head><body>
<h1>Preview de e-mails — Dicionário Gamer</h1>
<ul>
${SAMPLES.map((sample) => `<li><a href="./${sample.file}">${sample.label}</a>
<div style="color:#94a3b8;font-size:13px">Assunto: ${sample.content.subject}</div>
<code>${sample.content.text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</code></li>`).join('\n')}
</ul>
</body></html>`;
writeFileSync(join(outDir, 'index.html'), index, 'utf8');

console.log(`Preview gerado em: ${join(outDir, 'index.html')}`);

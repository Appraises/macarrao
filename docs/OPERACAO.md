# Operacao do Dicionario Gamer

## Requisitos

- Node.js 20 ou superior;
- PostgreSQL 15 ou superior;
- banco e usuario com permissao para criar tabelas e indices;
- frontend e API servidos por HTTPS em producao.

## Primeira instalacao local

1. Copie apenas os nomes necessarios de `.env.example` e `server/.env.example`
   para os arquivos locais correspondentes.
2. Crie o banco `dicionariogamer` e confira `DATABASE_URL`.
3. No diretorio `server`, execute:

```powershell
npm install
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

4. Na raiz do projeto, execute:

```powershell
npm install
npm run dev -- --host 0.0.0.0 --port 4175
```

Por padrao, a API fica em `http://localhost:3001` e o site em
`http://localhost:4175`.

## Variaveis essenciais

- `DATABASE_URL`: conexao PostgreSQL usada pelo Prisma.
- `JWT_SECRET`: segredo longo e aleatorio; trocar invalida tokens existentes.
- `CORS_ORIGINS`: origens exatas do frontend, separadas por virgula.
- `APP_URL`: URL publica do frontend usada nos links enviados por email.
- `PUBLIC_API_URL`: URL publica da API usada nas URLs de uploads.
- `RESEND_API_KEY` e `EMAIL_FROM`: envio de verificacao, recuperacao, LGPD e newsletter.
- `RESEND_WEBHOOK_SECRET`: validacao dos eventos assinados do Resend.
- `NEWSLETTER_TOKEN_SECRET`: HMAC exclusivo usado nos links opacos da newsletter.
- `NEWSLETTER_ENABLED`: libera o disparo diario; deve iniciar como `false`.
- `GEMINI_API_KEY`: validacao assistida de contribuicoes.

Nunca versionar `.env` ou chaves reais. Segredos compartilhados em chat, log ou
captura de tela devem ser revogados e substituidos antes da publicacao.

## Deploy

Ordem recomendada:

1. gerar backup consistente do PostgreSQL
   (`sudo systemctl start dicionario-backup.service`, veja "Backup e restauracao");
2. instalar dependencias com lockfile;
3. executar `npx prisma generate`;
4. executar `npx prisma migrate deploy`;
5. executar `npm run build` no backend e na raiz;
6. iniciar a API e verificar `/`;
7. publicar o frontend com `deploy/release-frontend.sh` (abaixo) e testar login,
   painel e uma leitura publica.

Nao executar `prisma migrate dev` em producao. O seed cria dados de demonstracao
e o administrador local; ele tambem nao deve ser executado automaticamente em
uma base de producao ja populada.

### Publicacao do frontend sem queda

O build de producao (`npm run build`) precisa alcancar a API para listar termos e
noticias. Se a API falhar, responder 429 ou devolver listas vazias, o build
**falha** em vez de gerar um site e um sitemap parciais. Para um build local sem
backend, use `SSG_ALLOW_EMPTY=true`.

Nunca gere o build direto em `/srv/dicionario/dist`: o `vite-react-ssg` esvazia a
pasta antes de gerar, e o site fica fora do ar durante o build. Gere em outro
lugar e publique com o script, que copia o build para
`/srv/dicionario/releases/frontend/<data>`, valida os arquivos essenciais, recusa
um sitemap com menos de 90% das URLs atuais, troca o symlink `dist` de forma
atomica e volta sozinho para a versao anterior se o smoke test falhar:

```bash
# na maquina de build
VITE_API_URL=https://api.dicionariogamer.com VITE_SITE_URL=https://dicionariogamer.com npm run build
tar -czf dist.tar.gz -C dist .
scp dist.tar.gz servidor:/tmp/

# no servidor
sudo bash /srv/dicionario/deploy/release-frontend.sh /tmp/dist.tar.gz
sudo bash /srv/dicionario/deploy/release-frontend.sh --rollback   # se precisar voltar
```

Na primeira execucao, a pasta `dist` atual vira a release `legacy-<data>` e `dist`
passa a ser um symlink; o Nginx continua apontando para o mesmo caminho.
Sao mantidas as 5 releases mais recentes.

### Frontend estatico e loaders do SSG

O build normaliza os nomes fisicos dos termos para o formato que o Nginx procura
depois de decodificar a URL. Assim, `/term/Hot%20drop` aponta para a pasta
`dist/term/Hot drop`, enquanto o manifesto continua usando a URL codificada.

Os JSONs do SSG nunca devem cair no fallback de `index.html`. Mantenha este bloco
antes do `location /` no virtual host do site:

```nginx
location ~ ^/static-loader-data(?:-manifest-[^/]+\.json|/.*\.json)$ {
    try_files $uri =404;
    add_header Cache-Control "no-cache";
}

location / {
    try_files $uri $uri/ /index.html;
    add_header Cache-Control "no-cache";
}
```

Depois de alterar o virtual host, valide e recarregue apenas o Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Um manifesto inexistente deve responder `404`, nunca `200 text/html`:

```bash
curl -I https://dicionariogamer.com/static-loader-data-manifest-inexistente.json
curl -I https://dicionariogamer.com/term/Hot%20drop
```

O cliente tambem possui uma protecao para abas abertas durante um deploy: se um
manifesto antigo desaparecer, ele ignora o loader estatico e consulta a API sem
derrubar a pagina. Ainda assim, evite apagar `dist` manualmente enquanto o Nginx
o serve; gere o build completo antes de recarregar a configuracao.

## Backup e restauracao

### Backup automatico

`deploy/backup/dicionario-backup.sh` roda todo dia as 03:30 (Brasilia) pelo
`dicionario-backup.timer`:

- `pg_dump` em formato customizado, validado com `pg_restore --list` e com
  checksum SHA-256, em `/var/backups/dicionario/db`;
- pacote dos uploads em `/var/backups/dicionario/uploads`;
- retencao local de 14 dias;
- com `RCLONE_REMOTE` definido, copia os dumps e espelha os uploads num bucket
  externo (R2/S3/B2), com retencao de 35 dias. **Sem isso, o backup nao protege
  contra a perda do VPS.**

Todo dia 1, o `dicionario-backup-verify.timer` restaura o dump mais recente num
banco descartavel, confere termos, usuarios e migracoes e apaga o banco. Ele
tambem falha se o ultimo dump tiver mais de 36 horas.

Instalacao (uma vez; ja roda o primeiro backup e o primeiro teste):

```bash
sudo rclone config                      # crie o remote do bucket de backup
sudo bash /srv/dicionario/deploy/install-backup.sh
sudoedit /etc/dicionario/backup.env     # defina RCLONE_REMOTE=<remote>:<bucket>
```

Acompanhamento:

```bash
systemctl list-timers 'dicionario-backup*'
sudo journalctl -u dicionario-backup.service -n 50 --no-pager
sudo cat /var/lib/dicionario-backup/last-success
```

### Uploads

Com `MEDIA_DRIVER=local`, as imagens ficam no disco do VPS. Prefira
`MEDIA_DRIVER=s3` (R2) em producao; todas as imagens enviadas pelo painel,
inclusive capas de noticia, passam a ir para o bucket. Enquanto usar disco,
mantenha `UPLOAD_DIR` fora do checkout do codigo e no mesmo caminho usado pelo
backup (`UPLOAD_DIR` em `/etc/dicionario/backup.env`).

### Backup e restauracao manuais

Exemplo de backup em formato customizado:

```powershell
pg_dump -Fc --no-owner --file dicionariogamer.dump $env:DATABASE_URL
```

Restaure primeiro em um banco vazio de validacao:

```powershell
createdb dicionariogamer_restore
pg_restore --exit-on-error --no-owner --no-acl --dbname dicionariogamer_restore dicionariogamer.dump
```

Aponte temporariamente `DATABASE_URL` para a copia e execute
`npx prisma migrate status`. Somente depois dessa verificacao use a restauracao
como rollback do ambiente. As migracoes Prisma deste projeto sao de avancar;
nao ha scripts `down`. Em falha de deploy, restaure o backup ou aplique uma
migracao corretiva revisada, em vez de editar uma migracao ja aplicada.

## Operacao do painel

Todas as APIs de jogos, mapas, noticias, campeonatos, equipes, jogadores,
partidas, rankings, uploads e solicitacoes LGPD ficam sob `/dashboard` e exigem
usuario `ADMIN`. Alteracoes de conteudo e conclusoes LGPD geram `AdminAuditLog`.

### Publicacao automatica de noticias

O importador `server/scripts/publish-news.mjs` e idempotente. Antes de criar uma
noticia, ele consulta o banco e ignora pautas com slug repetido, mesma URL de
fonte ou titulo essencialmente igual. Tambem trata conflito de slug criado por
outra rodada simultanea como duplicidade. A saida JSON separa `published` e
`skipped`, permitindo que cada rodada do giro diario registre o que foi
publicado e o que foi descartado.

Para conteudo referenciado, prefira arquivar. A exclusao definitiva e bloqueada
quando deixaria dependencias inconsistentes. Noticias agendadas tornam-se
publicas na primeira consulta posterior ao horario programado e registram o
evento de publicacao automatica.

## Solicitacoes LGPD

1. O titular autenticado exporta os dados imediatamente ou abre um pedido com a
   senha atual.
2. Correcao, anonimizacao e exclusao exigem confirmacao por email; o token e
   armazenado somente como SHA-256 e expira em 24 horas.
3. Depois da confirmacao, o prazo operacional e recalculado para 15 dias.
4. O painel registra responsavel, mudancas de estado, justificativa e timeline.
5. Na exclusao/anonimizacao, sessoes e credenciais sao invalidadas, dados do
   perfil e votos identificaveis sao removidos e contribuicoes preservadas ficam
   associadas a `Usuario removido`.

Falha no envio de email nao conclui nem confirma automaticamente o pedido. Depois
de corrigir `RESEND_API_KEY`/`EMAIL_FROM`, o titular pode solicitar reenvio.

## Newsletter Termo do Dia

O PostgreSQL e a fonte da lista, do consentimento e das entregas. O Resend e
somente o provedor de envio. A API nao usa `setInterval`: um timer do systemd
executa o comando idempotente todos os dias as 09:00 em `America/Sao_Paulo`.

Primeira implantacao:

1. publique a migracao e mantenha `NEWSLETTER_ENABLED=false`;
2. no Resend, crie `https://api.dicionariogamer.com/webhooks/resend` e selecione
   `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.failed`,
   `email.bounced`, `email.complained` e `email.suppressed`;
3. copie o segredo para `RESEND_WEBHOOK_SECRET`, reinicie a API e envie uma
   previa em `/dashboard/newsletter`;
4. teste confirmacao, clique e descadastro com um endereco controlado;
5. envie uma unica confirmacao aos inscritos legados com
   `npm run newsletter:confirm-legacy` no diretorio `server`;
6. instale `deploy/systemd/dicionario-newsletter.service` e
   `deploy/systemd/dicionario-newsletter.timer` em `/etc/systemd/system`;
7. somente entao mude `NEWSLETTER_ENABLED=true`, reinicie a API e habilite o timer.

```bash
sudo cp deploy/systemd/dicionario-newsletter.service /etc/systemd/system/
sudo cp deploy/systemd/dicionario-newsletter.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now dicionario-newsletter.timer
systemctl list-timers dicionario-newsletter.timer
```

Execucao manual segura e consulta dos ultimos logs:

```bash
cd /srv/dicionario/server
npm run newsletter:send-daily
sudo journalctl -u dicionario-newsletter.service -n 100 --no-pager
```

Uma campanha unica por data de Brasilia, o advisory lock no PostgreSQL e as
chaves idempotentes do Resend evitam disparos duplicados em reinicios. A
retentativa do painel considera apenas falhas sem ID aceito pelo Resend; estados
indeterminados, bounces, reclamacoes e supressoes nao sao reenviados.

O advisory lock fica numa transacao separada que so segura o lock; cada lote
grava o resultado do envio em commits proprios. Assim, o `resendEmailId` fica
visivel em segundos e os webhooks de bounce e reclamacao encontram a entrega,
e um descadastro durante o envio nao fica bloqueado. Se mesmo assim um webhook
de newsletter chegar antes do registro (ate 6 horas apos o evento), a API
responde `503` e o Resend reenvia mais tarde, em vez de o evento ser descartado.

## Verificacoes antes de liberar

```powershell
cd server
npm test
npm run build
npx prisma migrate status

cd ..
npx tsc --noEmit
npm run build
```

Confira ainda em desktop e mobile:

- listagens paginadas e seus estados vazio/erro;
- CRUDs e arquivamento no dashboard;
- upload e preview de imagem;
- editor de callouts;
- editor de campeonato e placar ao vivo;
- exportacao, confirmacao e fila LGPD.
- confirmacao, descadastro, webhook e painel da newsletter.

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
- `RESEND_API_KEY` e `EMAIL_FROM`: envio de verificacao, recuperacao e LGPD.
- `GEMINI_API_KEY`: validacao assistida de contribuicoes.

Nunca versionar `.env` ou chaves reais. Segredos compartilhados em chat, log ou
captura de tela devem ser revogados e substituidos antes da publicacao.

## Deploy

Ordem recomendada:

1. gerar backup consistente do PostgreSQL;
2. instalar dependencias com lockfile;
3. executar `npx prisma generate`;
4. executar `npx prisma migrate deploy`;
5. executar `npm run build` no backend e na raiz;
6. iniciar a API e verificar `/`;
7. publicar o frontend e testar login, painel e uma leitura publica.

Nao executar `prisma migrate dev` em producao. O seed cria dados de demonstracao
e o administrador local; ele tambem nao deve ser executado automaticamente em
uma base de producao ja populada.

## Backup e restauracao

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

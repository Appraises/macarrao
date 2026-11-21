# Noticias nas redes sociais

O publicador consulta as noticias que ja estao no ar e poe cada materia nova na fila uma vez por canal. Instagram e X podem ser habilitados separadamente. O timer roda na VPS, sem depender do computador do editor.

## Arte e previa

- No Instagram, cada materia vira um carrossel de dois JPEGs de 1080 x 1350: capa com manchete e chevrons, depois um resumo com chamada para ler a materia pelo link da bio. A capa usa a mesma foto de `News.image`; o credito fica no artigo. O X continua com uma unica imagem e URL direta na legenda.
- Os slides do Instagram usam o [simbolo 3D arredondado transparente](../public/brand/dg-control-3d-snes-dpad-bold.png), com D espelhado, direcional em cruz e bordas mais grossas, sobre a foto, conforme o [guia da marca](GUIA_DA_MARCA.md). A fonte vetorial e [dg-control-snes-dpad-bold.svg](../public/brand/dg-control-snes-dpad-bold.svg). O card do X usa o nome em texto, sem o simbolo.
- Na arte do Instagram, prefira um `seoTitle` de ate 80 caracteres que diga o fato completo. Quando for mais curto que a manchete, ele sera usado na imagem; a legenda mantem a manchete completa.
- Ao redigir, escolha ate cinco hashtags especificas da pauta (jogo, estudio, evento ou assunto central), sem preencher com termos genericos, e inclua no JSON `"instagramHashtags": ["GTAVI", "ViceCity"]`. O importador valida e salva a lista com a noticia. O publicador coloca apenas as tags salvas no fim da legenda do Instagram; noticias antigas sem tags continuam sem elas. O X nao muda.
- Se a capa estiver ausente, indisponivel ou invalida, a fila retenta e depois registra a falha. Nunca usa uma capa generica. Use JPEG, PNG, WebP, AVIF ou GIF servidos por HTTPS publico.
- Ao escolher uma capa no editorial, confirme que a permissao de uso inclui republicacao nas redes sem credito na arte. Se a licenca exigir credito no post, nao use essa capa na automacao.
- Em `server/`, rode `npm run social:preview` para a noticia publicada mais recente com capa, ou `npm run social:preview -- caminho/da/materia.json [slug]` para um export do editorial. Veja `.preview/social/post.jpg` e `.preview/social/post-2.jpg` (Instagram), `.preview/social/post-x.jpg` (X) e `.preview/social/legendas.json`. Nenhum post e enviado pela previa.

## Ativacao na VPS

Para o Giro publicar na VPS sem senha, instale uma vez com `sudo bash deploy/install-editorial-import.sh`. A rotina aceita apenas `sudo -n -u dicionario /usr/local/bin/dicionario-import-news --dry-run` ou `--apply`, com o JSON na entrada padrao. O codigo e o Prisma usados pelo comando ficam em uma copia controlada por root; o usuario do SSH nao le o `.env`. Rode o instalador novamente apos atualizar o importador ou o cliente Prisma na VPS. Se a saida ainda mostrar `capabilities.instagramHashtags: false`, preserve o JSON: essa versao importa a noticia sem guardar as tags.

1. No Instagram, use uma conta profissional (**Criador** ou **Empresa**). No [Meta App Dashboard](https://developers.facebook.com/apps/), configure **Instagram API with Unified Login** e crie uma configuracao que inclua `instagram_basic` e `instagram_content_publish`. Para um teste em modo de desenvolvimento, adicione a conta como **Instagram Tester**, aceite o convite no Instagram e gere um token de teste. A [documentacao do Unified Login](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/get-started) explica a configuracao e o fluxo de conexao.
2. Na VPS, configure `SOCIAL_INSTAGRAM_AUTH_MODE=unified_login`, `SOCIAL_INSTAGRAM_ACCESS_TOKEN`, `SOCIAL_INSTAGRAM_API_VERSION` e `SOCIAL_INSTAGRAM_USER_ID` no `server/.env`. Para descobrir as contas profissionais compartilhadas com o app sem expor o token, rode `npm run social:instagram-accounts` dentro de `server/` depois de inserir o token no `.env`; copie o `id` da conta correta para `SOCIAL_INSTAGRAM_USER_ID`. O token fica somente no servidor. A validade depende da expiracao escolhida na configuracao da Meta; renove-o antes do vencimento. Nunca o coloque no repositorio, em comandos com historico ou no chat.
3. Configure o link na bio como [Ultimas noticias](https://dicionariogamer.com.br/noticias/?utm_source=instagram&utm_medium=social&utm_campaign=instagram_bio). A campanha `instagram_bio` identifica as chegadas ao site com analytics habilitado; o link fixo nao atribui a visita a um post especifico.
4. Para ativar o X, configure um app OAuth 2.0 confidencial e autorize a conta com `tweet.read tweet.write users.read media.write offline.access`. Preencha o ID, o segredo do app e o refresh token inicial em `server/.env`. Confira [os precos da API do X](https://docs.x.com/x-api/getting-started/pricing) antes de carregar creditos. A renovacao do X usa o arquivo privado `server/.social-private/x-token.json`; preserve-o entre deploys. Para reconectar outra conta, pare o timer e espere o servico encerrar antes de trocar o token inicial e remover o arquivo privado anterior.
5. No deploy, aplique a migracao com `npx prisma migrate deploy` e gere o cliente com `npx prisma generate`, a partir de `server/`. Deixe os canais desligados ate verificar o banco, as credenciais e a rota HTTPS `PUBLIC_API_URL/uploads/social/`, que deve servir as imagens sem autenticacao. `APP_URL` aponta para o site publico.
6. Defina o `SOCIAL_*_START_AT` no horario de ativacao, com data, hora e fuso. Assim, as materias antigas nao entram na fila. Habilite somente o canal ja conectado e acompanhe a primeira materia publicada apos esse horario.

No checkout da VPS, instale as unidades:

```sh
sudo install -m 644 deploy/systemd/dicionario-social-news.service /etc/systemd/system/
sudo install -m 644 deploy/systemd/dicionario-social-news.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now dicionario-social-news.timer
sudo journalctl -u dicionario-social-news.service -n 50 --no-pager
```

## Operacao

Em `server/`, rode `npm run social:publish -- --status` para consultar a fila. Falhas temporarias de preparo retentam automaticamente. Se a rede puder ter aceitado um post sem devolver confirmacao, a entrega fica em `REVIEW` para evitar duplicacao. Confira a conta indicada antes de resolver:

- Se o post saiu: `npm run social:publish -- --mark-published ID_DA_FILA ID_DO_POST`.
- Se o post nao saiu, corrija a causa e rode: `npm run social:publish -- --retry ID_DA_FILA --confirmed-not-published`.

O diretorio `server/uploads/social/` contem copias publicas e geradas somente para a Meta buscar durante o envio. Apos confirmar a publicacao, as copias antigas podem ser removidas sem afetar a capa da materia.

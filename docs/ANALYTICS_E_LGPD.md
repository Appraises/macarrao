# Analytics e LGPD

Status: dashboard administrativo implementado em 14/07/2026.

Este documento registra as decisões técnicas, o que já foi entregue e o que precisa ser configurado antes do lançamento.

## 1. Objetivos de medição

O analytics deve responder, no mínimo:

- Quais páginas e termos recebem tráfego orgânico.
- Quais fontes, campanhas e dispositivos trazem visitantes.
- Quais termos têm maior engajamento e quais páginas geram saída.
- Quantos visitantes pesquisam, criam conta e contribuem.
- Qual é a taxa de conversão entre visita, cadastro e contribuição.
- Quais URLs inexistentes geram erros 404.

Plausible foi escolhido por ser leve, não usar cookies analíticos ou identificadores persistentes e oferecer métricas de aquisição, conteúdo, conversão e retenção agregada.

## 2. Arquitetura implementada

- O tracker oficial `@plausible-analytics/tracker` é inicializado uma vez no layout raiz.
- Pageviews de navegação React Router são capturados automaticamente.
- O tracker só é iniciado quando `VITE_PLAUSIBLE_DOMAIN` está preenchido.
- Localhost não é capturado por padrão.
- O opt-out usa a chave reconhecida pelo tracker (`plausible_ignore`).
- O controle fica disponível na Política de Privacidade e no rodapé.
- Nome, email, nick, ID de usuário, comentários e textos de contribuição não são enviados.

## 3. Eventos

| Evento | Quando dispara | Propriedades permitidas |
| --- | --- | --- |
| `Search Submitted` | Busca manual enviada | origem, método, existência de sugestões |
| `Search Suggestion Selected` | Sugestão pública selecionada | origem, posição, termo público |
| `Category Selected` | Categoria rápida selecionada | categoria, origem |
| `Account Created` | Cadastro concluído | método |
| `Login Completed` | Login concluído | método |
| `Contribution Submitted` | Termo enviado para revisão | jogo selecionado, quantidade de tópicos |
| `Term Vote` | Voto registrado | direção, termo público, estado final |
| `Term Reported` | Denúncia registrada | motivo, termo público |
| `404` | Página inexistente exibida | URL capturada pelo pageview |

Os eventos devem ser cadastrados como Goals no painel do Plausible com os nomes exatamente iguais.

## 4. Funis recomendados

1. Página inicial -> `Search Submitted` -> página `/term/*`.
2. Página de conteúdo -> `/login` -> `Account Created`.
3. `Account Created` -> `/contribuir` -> `Contribution Submitted`.
4. Página `/term/*` -> `Term Vote` ou `Term Reported`.

Conectar o Google Search Console ao Plausible para cruzar consultas orgânicas, páginas de entrada e posição no Google. O texto digitado na busca interna não deve ser enviado como propriedade livre.

## 5. Configuração antes do lançamento

No ambiente de produção do frontend:

```env
VITE_SITE_URL=https://seu-dominio.com.br
VITE_PLAUSIBLE_DOMAIN=seu-dominio.com.br
VITE_PLAUSIBLE_ENDPOINT=https://plausible.io/api/event
VITE_PLAUSIBLE_CAPTURE_LOCALHOST=false
VITE_LEGAL_CONTROLLER_NAME=Nome legal do responsável
VITE_LEGAL_CONTACT_EMAIL=privacidade@seu-dominio.com.br
```

No backend:

```env
TERMS_VERSION=2026-07-13
PRIVACY_VERSION=2026-07-13
```

Depois:

1. Criar o site no Plausible usando o domínio final.
2. Fazer deploy com as variáveis acima.
3. Usar o verificador de instalação do Plausible.
4. Criar todos os Goals da tabela de eventos.
5. Conectar o Search Console.
6. Excluir acessos da equipe usando o opt-out do rodapé.
7. Testar uma navegação real e confirmar pageviews, origem e eventos no painel em tempo real.

## 6. Entregas legais

- Rotas públicas `/termos` e `/privacidade`, com SEO e prerender.
- Links funcionais no rodapé.
- Controle de analytics acessível a qualquer visitante.
- Checkbox obrigatório no cadastro com links para os documentos.
- Validação do aceite também no backend.
- Registro de data e versão de Termos e Privacidade no usuário.
- Política descrevendo dados de conta, comunidade, logs, analytics e fornecedores atuais.

## 7. Banco de dados

A migração `20260713120000_add_legal_acceptance` adiciona:

- `termsAcceptedAt`
- `termsVersion`
- `privacyAcknowledgedAt`
- `privacyVersion`

Aplicar em cada ambiente antes de publicar o novo backend:

```bash
npx prisma migrate deploy
```

## 8. Checklist jurídico e operacional

Antes do lançamento, o responsável pelo produto deve:

- Confirmar nome jurídico ou identificação do controlador e email funcional.
- Confirmar provedor de hospedagem, banco, região e política de retenção de logs.
- Revisar contratos e transferências internacionais dos fornecedores.
- Definir processo interno e responsável por pedidos de titulares e incidentes.
- Definir prazos de retenção operacionais e rotina de exclusão ou anonimização.
- Submeter os textos a revisão jurídica; o conteúdo implementado é uma base técnica e não substitui assessoria legal.
- Atualizar as versões no frontend e backend sempre que houver mudança material.

## 9. Dashboard administrativo

O painel fica em `/dashboard/analytics` e possui as abas Visão geral, Aquisição, SEO, Dicionário, Comunidade e Qualidade. Todas as respostas são montadas a partir do PostgreSQL; a abertura do dashboard nunca aguarda uma API externa.

O período padrão é de 28 dias, com comparação ao período imediatamente anterior. Os filtros ficam na URL, as tabelas são paginadas e cada aba pode ser exportada em CSV.

As variáveis de integração ficam somente no backend:

```env
ANALYTICS_HASH_SECRET=segredo-exclusivo-e-aleatorio
ANALYTICS_SYNC_ENABLED=true
PLAUSIBLE_SITE_ID=seu-dominio.com.br
PLAUSIBLE_STATS_API_KEY=
GOOGLE_SEARCH_CONSOLE_SITE_URL=sc-domain:seu-dominio.com.br
GOOGLE_SERVICE_ACCOUNT_JSON_BASE64=
GOOGLE_PAGESPEED_API_KEY=
SENTRY_DSN=
SENTRY_ORG=
SENTRY_API_TOKEN=
SENTRY_FRONTEND_PROJECT=
SENTRY_BACKEND_PROJECT=
```

`GOOGLE_SERVICE_ACCOUNT_JSON_BASE64` é o JSON completo da service account codificado em Base64. A conta deve ter acesso de leitura à propriedade do Search Console. O token do Sentry deve permitir leitura da organização, eventos, issues e monitores. Nenhuma dessas credenciais deve usar prefixo `VITE_`.

No frontend, `VITE_SENTRY_DSN` habilita a captura sem PII. `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` e `SENTRY_PROJECT` são usados somente no CI para publicar source maps e não entram no bundle.

## 10. Sincronização e goals

Com `ANALYTICS_SYNC_ENABLED=true`, o backend executa no fuso `America/Sao_Paulo`:

- Plausible a cada hora, reprocessando os últimos sete dias.
- Sentry a cada 15 minutos.
- Search Console diariamente às 05:00, com inspeção limitada a 200 URLs.
- CrUX e PageSpeed às segundas-feiras, às 06:00.
- Remoção do texto de buscas com mais de 90 dias diariamente, às 04:00.

Os jobs usam lock consultivo do PostgreSQL, upsert idempotente, timeout, retentativas exponenciais e histórico em `AnalyticsSyncRun`. Também podem ser iniciados pelo botão de sincronização, com cooldown de cinco minutos e auditoria administrativa.

Cadastre no Plausible os goals `Visit Classified`, `Search Submitted`, `Search No Results`, `Search Result Click`, `Search Suggestion Selected`, `Term Opened`, `Term Shared`, `Account Created`, `Contribution Submitted`, `Bot Challenge Shown`, `Bot Challenge Passed`, `Bot Challenge Failed`, `Contribution Rate Limited` e `404`.

Um provedor sem credenciais aparece como `NOT_CONFIGURED`; falhas externas não impedem as métricas internas e os últimos dados sincronizados continuam disponíveis.

## 11. Privacidade da busca

A busca interna só é persistida quando a requisição contém `X-Analytics-Enabled: true`. O registro não contém IP, sessão nem usuário. A consulta é normalizada, protegida por HMAC e redigida quando contém email, telefone, URL, UUID, token ou mais de 80 caracteres.

Consultas textuais só aparecem no painel quando atingem pelo menos três ocorrências no período. Após 90 dias, o texto é apagado e apenas o hash e os contadores agregados permanecem. O token que vincula uma busca à abertura de um termo é assinado, expira em 30 minutos e não é enviado ao Plausible.

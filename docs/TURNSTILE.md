# Cloudflare Turnstile

O cadastro exige Turnstile quando `TURNSTILE_ENABLED=true`. Contribuicoes usam
uma politica adaptativa: o desafio aparece para contas novas sem verificacao
recente, atividade acelerada ou repeticao diaria acima dos limites configurados.
O backend sempre toma a decisao final.

## Configuracao

1. Crie widgets separados para desenvolvimento e producao no painel Turnstile.
2. Restrinja cada widget aos hostnames do respectivo ambiente.
3. No frontend, defina `VITE_TURNSTILE_SITE_KEY` com a site key publica.
4. No backend, defina `TURNSTILE_SECRET_KEY`, `TURNSTILE_ENABLED=true` e
   `TURNSTILE_ALLOWED_HOSTNAMES`.
5. Gere um `ABUSE_HASH_SECRET` exclusivo e longo. Ele protege IPs e IDs usados
   nos contadores; nao reutilize a site key nem a secret key do Turnstile.
6. Em uma politica CSP, permita `https://challenges.cloudflare.com` em
   `script-src`, `frame-src` e `connect-src`.

Para desenvolvimento local, a Cloudflare fornece chaves de teste. Nao habilite
o backend com uma secret key real enquanto o frontend estiver sem site key.

## Regras

- Cadastro: desafio obrigatorio e limite de cinco contas por IP a cada hora.
- Conta: cinco contribuicoes em uma janela de 30 minutos, por padrao.
- Rede/IP: vinte tentativas de contribuicao em 30 minutos, por padrao.
- Desafio adaptativo: contas novas, duas contribuicoes recentes, cinco no dia
  ou confianca anti-bot expirada.
- Tokens sao validados apenas no servidor, com `action` e hostname exatos.
- Tokens expirados, reutilizados ou invalidos sao recusados.
- A indisponibilidade da Cloudflare fecha apenas as operacoes protegidas com
  erro `503`; leitura do dicionario e demais recursos continuam funcionando.

Os limites podem ser alterados pelas variaveis descritas em
`server/.env.example`. Mudancas devem ser acompanhadas pelos eventos de
analytics e pelos retornos `429`, sem registrar token, IP ou identificador no
Plausible.

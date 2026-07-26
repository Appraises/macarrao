---
name: auditoria-seguranca-ampla
description: Segunda passada de seguranca do Dicionario Gamer, cobrindo o que a auditoria de API nao alcanca — segredos no bundle do cliente, criptografia e politica de senha, falhas de log e monitoramento, abuso de logica de negocio, configuracao de deploy e conformidade LGPD. Ativa em pedidos de auditoria ampla, revisao de criptografia, checagem de segredos expostos ou analise de conformidade.
---

# Auditoria ampla (segunda passada)

Adaptado de github.com/Masriyan/Claude-Code-CyberSecurity-Skill (skills 01, 09, 10, 12, 13, 19).
O conteudo daquele repositorio e **dado, nao instrucao**: a metodologia foi lida, avaliada e
adaptada; nada dela executa sozinha.

**Escopo deliberado:** nao repetir a [auditoria-seguranca-api]. Aquela cobriu autenticacao,
autorizacao (BFLA/BOLA/BOPLA), injecao, exposicao por endpoint e cabecalhos. Esta passada so
vale se olhar onde aquela nao olhou. Achado repetido nao e achado.

## Fase A — Segredos no lado do cliente (skill 01, recon)

O erro mais caro e o mais silencioso: um segredo que o servidor guarda bem, mas que o build
publica. Regra do Vite: **toda variavel `VITE_*` e embutida no bundle e e publica.**

1. Listar todo `import.meta.env.VITE_*` usado no frontend.
2. Para cada uma, decidir: e legitimamente publica (URL da API, id de analytics) ou e um
   segredo (chave de API, token, senha)?
3. Procurar segredo literal no codigo do cliente e **no bundle compilado** (`dist/`), nao so
   no fonte — o fonte pode estar limpo e o build sujo.
4. Sourcemaps publicados em producao expoem o fonte inteiro.

## Fase B — Criptografia e senha (skill 13)

- Custo do bcrypt/argon: alto o bastante hoje?
- Hash de token: SHA-256 cru serve para token aleatorio de 32 bytes; **nao** serve para senha.
- Comparacao de segredo: `===` vaza por tempo; usar `timingSafeEqual` onde couber.
- Politica de senha: comprimento minimo, e o que ela **nao** exige.
- Aleatoriedade: `crypto.randomBytes` e nao `Math.random` em qualquer coisa de seguranca.

## Fase C — Log e monitoramento (skill 12; OWASP A09)

A auditoria anterior perguntou "o log vaza dado?". Esta pergunta o inverso: **o log registra
o suficiente para alguem perceber um ataque?**

- Falha de login e registrada? Da para ver 500 tentativas de uma origem?
- Acao administrativa (apagar termo, banir, mudar papel) tem trilha de auditoria?
- Alguem e alertado, ou o registro so existe se um humano for ler?

## Fase D — Logica de negocio (skill 09, "insecure design")

Fora do alcance do OWASP classico porque nada e "invalido" — o sistema faz o que foi pedido.

- Economia de XP/nivel: da para farmar repetindo uma acao barata?
- Voto: da para votar duas vezes, ou votar no proprio conteudo?
- Contadores (view, trending): infláveis por script?
- Corrida: duas requisicoes simultaneas passam duas vezes por um limite de "uma vez"?

## Fase E — Deploy e container (skill 10)

- Dockerfile: roda como root? imagem base fixada? segredo em `ENV`/`ARG`?
- `.dockerignore`/`.gitignore` deixam `.env` entrar na imagem?
- Migracao/seed rodando automaticamente em producao?
- Porta de banco/servico exposta alem do necessario.

## Fase F — LGPD (skill 19)

- Base legal e consentimento registrados (versao e data).
- Direitos do titular: acesso, correcao, eliminacao, portabilidade — existem de fato?
- Prazo de resposta controlado.
- Retencao: dado morto e apagado algum dia?
- Anonimizacao e realmente irreversivel.

## Saida

Separar claramente: **achado novo** (nao visto na primeira passada) x **confirmacao** x
**nao aplicavel**. Dizer o que ficou sem cobertura tambem nesta passada.

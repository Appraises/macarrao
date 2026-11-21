# Fontes das logos de equipes

As imagens desta pasta identificam as equipes nas paginas de cobertura competitiva. O frontend nao resolve logos por nome: ele sempre usa o campo `EsportsTeam.logo`.

## Prioridade de origem

1. Kit de marca ou CDN da propria organizacao.
2. Arquivo publicado por uma competicao oficial da modalidade.
3. Provedor competitivo configurado no backend.
4. Fonte comunitaria, apenas como fallback temporario.

As versoes de FURIA, MIBR, paiN Gaming, Imperial, Team Liquid, NRG e G2 sao espelhadas dos arquivos usados pela BLAST nas paginas oficiais das equipes de Counter-Strike. A RED Canids vem do site oficial da organizacao. As origens dos fallbacks comunitarios constam no manifesto `server/scripts/esports-team-logos.mjs`.

Os arquivos em `lol/` sao as logos oficiais das oito equipes do mata-mata do Worlds 2026 e da representante do CBLOL na fase suica, publicadas na [agenda do LoL Esports](https://lolesports.com/pt-BR). O manifesto registra o arquivo de origem de cada equipe.

Execute `npm run esports:refresh-team-logos` dentro de `server` para baixar novamente os arquivos oficiais e aplicar os caminhos locais no banco. A sincronizacao da Liquipedia preserva logos locais curados e so atualiza o logo quando ainda nao existe uma versao local.

Marcas e logotipos permanecem propriedade de suas respectivas organizacoes e sao exibidos apenas para identificacao editorial das equipes.

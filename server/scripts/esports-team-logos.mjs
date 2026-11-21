const lolTeamLogo = (key, aliases, file) => ({
    key,
    aliases,
    path: `/esports/teams/lol/${key}.png`,
    source: 'https://lolesports.com/pt-BR',
    assetUrl: `https://am-a.akamaihd.net/image?f=${encodeURIComponent(`http://static.lolesports.com/teams/${file}`)}&resize=96%3A`,
    sourceTier: 'OFFICIAL_COMPETITION',
});

export const TEAM_LOGOS = [
    {
        key: 'furia',
        aliases: ['FURIA', 'FURIA Esports'],
        path: '/esports/teams/furia.svg',
        source: 'https://blast.tv/cs/team/f239109c/furia',
        assetUrl: 'https://assets.blast.tv/images/teams/f239109c-ffef-4e83-830e-5ca340ee432b?width=512&format=png',
        sourceTier: 'OFFICIAL_COMPETITION',
    },
    {
        key: 'loud',
        aliases: ['LOUD'],
        path: '/esports/teams/loud.svg',
        source: 'https://commons.wikimedia.org/wiki/File:LOUD_logo.svg',
        sourceTier: 'COMMUNITY_FALLBACK',
    },
    {
        key: 'mibr',
        aliases: ['MIBR', 'Made in Brazil'],
        path: '/esports/teams/mibr.png',
        source: 'https://blast.tv/cs/team/6959ccd1/mibr',
        assetUrl: 'https://assets.blast.tv/images/teams/6959ccd1-c236-412d-9720-d9951b491bd2?width=512&format=png',
        sourceTier: 'OFFICIAL_COMPETITION',
    },
    {
        key: 'pain',
        aliases: ['paiN', 'paiN Gaming', 'Pain Gaming'],
        path: '/esports/teams/pain-gaming.svg',
        source: 'https://blast.tv/cs/team/28a16bf8/pain',
        assetUrl: 'https://assets.blast.tv/images/teams/28a16bf8-fb58-49f6-b44e-dc06999ed24f?width=512&format=png',
        sourceTier: 'OFFICIAL_COMPETITION',
    },
    {
        key: 'imperial',
        aliases: ['Imperial', 'Imperial Esports'],
        path: '/esports/teams/imperial.svg',
        source: 'https://blast.tv/cs/team/7b4882d3/imperial',
        assetUrl: 'https://assets.blast.tv/images/teams/7b4882d3-3faf-4920-8565-00b3a3431e2a?width=512&format=png',
        sourceTier: 'OFFICIAL_COMPETITION',
    },
    {
        key: 'red',
        aliases: ['RED Canids', 'RED Canids Kalunga'],
        path: '/esports/teams/red-canids.png',
        source: 'https://redcanids.com.br/',
        sourceTier: 'OFFICIAL_TEAM',
    },
    {
        key: 'fluxo',
        aliases: ['Fluxo', 'Fluxo W7M'],
        path: '/esports/teams/fluxo.png',
        source: 'https://liquipedia.net/honorofkings/Fluxo',
        sourceTier: 'PROVIDER_FALLBACK',
    },
    {
        key: 'keyd',
        aliases: ['Vivo Keyd', 'Vivo Keyd Stars', 'Keyd Stars'],
        path: '/esports/teams/vivo-keyd-stars.png',
        source: 'https://liquipedia.net/freefire/Keyd_Stars',
        sourceTier: 'PROVIDER_FALLBACK',
    },
    {
        key: 'liquid',
        aliases: ['Team Liquid', 'Team Liquid Brazil'],
        path: '/esports/teams/team-liquid.svg',
        source: 'https://blast.tv/cs/team/b75bce93/liquid',
        assetUrl: 'https://assets.blast.tv/images/teams/b75bce93-54a8-42b1-9b1c-1b16b5512ab7?width=512&format=png',
        sourceTier: 'OFFICIAL_COMPETITION',
    },
    {
        key: 'nrg',
        aliases: ['NRG', 'NRG Esports'],
        path: '/esports/teams/nrg.png',
        source: 'https://blast.tv/cs/team/a2c6952f/nrg',
        assetUrl: 'https://assets.blast.tv/images/teams/a2c6952f-8ca1-49b7-bcd5-43d89158604c?width=512&format=png',
        sourceTier: 'OFFICIAL_COMPETITION',
    },
    {
        key: 'g2',
        aliases: ['G2', 'G2 Esports'],
        path: '/esports/teams/g2-esports.svg',
        source: 'https://blast.tv/cs/team/3f141cb2/g2',
        assetUrl: 'https://assets.blast.tv/images/teams/3f141cb2-6daa-432b-9413-62e1934d12ce?width=512&format=png',
        sourceTier: 'OFFICIAL_COMPETITION',
    },
    lolTeamLogo('invictus-gaming', ['Invictus Gaming'], '1634762917340_300px-Invictus_Gaming_logo.png'),
    lolTeamLogo('top-esports', ['Top Esports'], '1592592064571_TopEsportsTES-01-FullonDark.png'),
    lolTeamLogo('geng', ['Gen.G', 'Gen.G Esports'], '1773829250929_GENGLOGO_GOLD.png'),
    lolTeamLogo('lyon', ['LYON'], '1743717443673_isotypelyon-03.png'),
    lolTeamLogo('dplus-kia', ['Dplus KIA'], '1673260049703_DPlusKIALOGO11.png'),
    lolTeamLogo('bilibili-gaming', ['Bilibili Gaming'], '1682322954525_Bilibili_Gaming_logo_20211.png'),
    lolTeamLogo('t1', ['T1'], '1726801573959_539px-T1_2019_full_allmode.png'),
    lolTeamLogo('karmine-corp', ['Karmine Corp'], '1704714951336_KC.png'),
    lolTeamLogo('los', ['L\u00D8S', 'LOS'], '1784013312149_LOS-OLaranja.png'),
];

export const teamLogoByKey = (key) => TEAM_LOGOS.find((entry) => entry.key === key)?.path || null;

export const selectTeamLogos = (keys, entries = TEAM_LOGOS) => {
    for (const key of keys) if (!entries.some((entry) => entry.key === key)) throw new Error(`Logo key not found: ${key}`);
    return keys.length ? entries.filter((entry) => keys.includes(entry.key)) : entries;
};

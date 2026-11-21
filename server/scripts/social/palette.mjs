// Cor de cada editoria nos posts sociais. A mesma cor pinta a logo 3D do card,
// o selo da editoria, a faixa do topo, os detalhes e um leve tom no degradê da
// foto, para que a grade do perfil se separe por assunto à primeira vista.
//
// As logos ficam em public/brand/editorias e são geradas a partir desta tabela:
//   node scripts/generate-editorial-logos.mjs   (na raiz do projeto)

const normalize = (value) => String(value ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]+/g, '');

// Todas as cores têm contraste alto sobre o azul-noite #080f19 e aceitam o
// texto escuro do selo por cima. Indústria usa o azul da marca.
export const editorias = {
    INDUSTRIA: { key: 'industria', accent: '#38bdf8', label: 'Indústria', brand: true },
    LANCAMENTOS: { key: 'lancamentos', accent: '#facc15', label: 'Lançamentos' },
    RUMORES: { key: 'rumores', accent: '#c084fc', label: 'Rumores' },
    ESPORTS: { key: 'esports', accent: '#fb923c', label: 'E-sports' },
    XBOX: { key: 'xbox', accent: '#4ade80', label: 'Xbox' },
    PLAYSTATION: { key: 'playstation', accent: '#818cf8', label: 'PlayStation' },
    NINTENDO: { key: 'nintendo', accent: '#f87171', label: 'Nintendo' },
    PC: { key: 'pc', accent: '#e2e8f0', label: 'PC' },
};

/** Editorias novas ou desconhecidas caem no visual padrão da marca. */
export function editorialTheme(category) {
    return editorias[normalize(category)] ?? editorias.INDUSTRIA;
}

export const editorialLogoFile = (theme) => `dg-control-3d-${theme.key}.png`;

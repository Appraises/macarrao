export type EditorialPersonaKey = 'games' | 'industry' | 'rumors' | 'esports';

export interface EditorialPersonaOption {
    key: EditorialPersonaKey;
    name: string;
    beat: string;
    categories: string[];
}

export const EDITORIAL_PERSONAS: readonly EditorialPersonaOption[] = [
    { key: 'games', name: 'Lucas Andrade', beat: 'Jogos e lançamentos', categories: ['GERAL', 'LANÇAMENTOS', 'ATUALIZAÇÕES', 'NINTENDO', 'PLAYSTATION', 'XBOX', 'PC', 'ANÁLISES', 'PROMOÇÕES'] },
    { key: 'industry', name: 'Marina Costa', beat: 'Indústria e bastidores', categories: ['INDÚSTRIA', 'NEGÓCIOS', 'TECNOLOGIA', 'BASTIDORES'] },
    { key: 'rumors', name: 'Rafael Nunes', beat: 'Rumores e investigação', categories: ['RUMORES', 'RUMOR', 'VAZAMENTOS'] },
    { key: 'esports', name: 'Gabriel Martins', beat: 'E-sports e cenário competitivo', categories: ['E-SPORTS', 'ESPORTS', 'COMPETITIVO'] }
] as const;

const normalize = (value: string) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

export const editorialPersonaForCategory = (category?: string | null) => {
    const normalizedCategory = normalize(category || '');
    return EDITORIAL_PERSONAS.find((persona) => (
        persona.key !== 'games'
        && persona.categories.some((candidate) => normalize(candidate) === normalizedCategory)
    )) || EDITORIAL_PERSONAS[0];
};

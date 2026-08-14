export type EditorialPersonaKey = 'games' | 'industry' | 'rumors' | 'esports';

export interface EditorialPersona {
    key: EditorialPersonaKey;
    name: string;
    email: string;
    beat: string;
    bio: string;
    categories: string[];
}

export const EDITORIAL_PERSONAS: readonly EditorialPersona[] = [
    {
        key: 'games',
        name: 'Lucas Andrade',
        email: 'lucas.andrade@system.dicionariogamer.invalid',
        beat: 'Jogos e lançamentos',
        bio: 'Persona editorial fictícia do Dicionário Gamer dedicada a lançamentos, atualizações, plataformas, análises e promoções.',
        categories: ['LANÇAMENTOS', 'ATUALIZAÇÕES', 'NINTENDO', 'PLAYSTATION', 'XBOX', 'PC', 'ANÁLISES', 'PROMOÇÕES', 'GERAL']
    },
    {
        key: 'industry',
        name: 'Marina Costa',
        email: 'marina.costa@system.dicionariogamer.invalid',
        beat: 'Indústria e bastidores',
        bio: 'Persona editorial fictícia do Dicionário Gamer dedicada a negócios, estúdios, mercado de trabalho, tecnologia e bastidores da indústria.',
        categories: ['INDÚSTRIA', 'NEGÓCIOS', 'TECNOLOGIA', 'BASTIDORES']
    },
    {
        key: 'rumors',
        name: 'Rafael Nunes',
        email: 'rafael.nunes@system.dicionariogamer.invalid',
        beat: 'Rumores e investigação',
        bio: 'Persona editorial fictícia do Dicionário Gamer dedicada a rumores, vazamentos e pistas documentais, sempre com origem e grau de confirmação explícitos.',
        categories: ['RUMORES', 'RUMOR', 'VAZAMENTOS']
    },
    {
        key: 'esports',
        name: 'Gabriel Martins',
        email: 'gabriel.martins@system.dicionariogamer.invalid',
        beat: 'E-sports e cenário competitivo',
        bio: 'Persona editorial fictícia do Dicionário Gamer dedicada a campeonatos, equipes, escalações, partidas e ao cenário competitivo brasileiro.',
        categories: ['E-SPORTS', 'ESPORTS', 'COMPETITIVO']
    }
] as const;

const normalize = (value: string) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

export const findEditorialPersona = (author?: string | null): EditorialPersona | null => {
    const normalizedAuthor = normalize(author || '');
    return EDITORIAL_PERSONAS.find((persona) => normalize(persona.name) === normalizedAuthor) || null;
};

export const editorialPersonaForCategory = (category?: string | null): EditorialPersona => {
    const normalizedCategory = normalize(category || '');
    return EDITORIAL_PERSONAS.find((persona) => (
        persona.key !== 'games'
        && persona.categories.some((candidate) => normalize(candidate) === normalizedCategory)
    )) || EDITORIAL_PERSONAS[0];
};

export const publicEditorialPersona = (author?: string | null) => {
    const persona = findEditorialPersona(author);
    if (!persona) return null;

    return {
        key: persona.key,
        name: persona.name,
        beat: persona.beat,
        bio: persona.bio,
        disclosure: 'Persona editorial fictícia'
    };
};

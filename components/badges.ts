/**
 * Visual catalog for badges. The backend (services/badges.ts) owns the ids and the
 * "how you earn it" logic; this owns how each one reads on screen. Ids must match on
 * both sides. The artwork itself lives in BadgeArt.tsx.
 */
export type BadgeTier = 'bronze' | 'prata' | 'ouro' | 'lendario';

export interface BadgeDisplay {
    id: string;
    name: string;
    description: string;
    tier: BadgeTier;
}

// Order matters: this is the display order in the grid (easy → prestige).
export const BADGE_CATALOG: BadgeDisplay[] = [
    { id: 'estreante', name: 'Estreante', description: 'Publicou seu primeiro termo.', tier: 'bronze' },
    { id: 'primeira_voz', name: 'Primeira Voz', description: 'Deixou seu primeiro comentário.', tier: 'bronze' },
    { id: 'gramatico', name: 'Gramático', description: 'Registrou as flexões de um termo.', tier: 'bronze' },
    { id: 'etiquetador', name: 'Etiquetador', description: 'Classificou o tom de um termo.', tier: 'bronze' },
    { id: 'colaborador', name: 'Colaborador', description: 'Publicou 10 termos.', tier: 'prata' },
    { id: 'multiverso', name: 'Multiverso', description: 'Publicou termos de 5 jogos diferentes.', tier: 'prata' },
    { id: 'multifacetado', name: 'Multifacetado', description: 'Adicionou um novo significado a uma palavra existente.', tier: 'prata' },
    { id: 'tagarela', name: 'Tagarela', description: 'Deixou 50 comentários.', tier: 'prata' },
    { id: 'viral', name: 'Viral', description: 'Um termo seu passou de 100 votos.', tier: 'prata' },
    { id: 'veterano', name: 'Veterano', description: 'Alcançou o nível 5.', tier: 'prata' },
    { id: 'autor', name: 'Autor', description: 'Publicou 50 termos.', tier: 'ouro' },
    { id: 'hall_da_fama', name: 'Hall da Fama', description: 'Um termo seu passou de 500 votos.', tier: 'ouro' },
    { id: 'lexicografo', name: 'Lexicógrafo', description: 'Publicou 100 termos.', tier: 'lendario' },
    { id: 'lenda', name: 'Lenda', description: 'Alcançou o nível 10.', tier: 'lendario' },
    { id: 'pioneiro', name: 'Pioneiro', description: 'Esteve entre os primeiros membros.', tier: 'lendario' },
];

export const BADGE_BY_ID = new Map(BADGE_CATALOG.map((badge) => [badge.id, badge]));

export const TIER_LABEL: Record<BadgeTier, string> = {
    bronze: 'Bronze',
    prata: 'Prata',
    ouro: 'Ouro',
    lendario: 'Lendário',
};

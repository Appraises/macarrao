// Vibrant accents (same family as the generated avatars). Each term gets a stable
// color derived from its word, so grids and rails feel alive without being random
// on every render. Shared so every term surface uses the exact same mapping.
export const TERM_PALETTE = ['#0EA5E9', '#22D3EE', '#818CF8', '#C084FC', '#F472B6', '#34D399'];

export const accentFor = (word: string): string =>
    TERM_PALETTE[[...word].reduce((sum, c) => sum + c.charCodeAt(0), 0) % TERM_PALETTE.length];

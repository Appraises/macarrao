import { describe, expect, it } from 'vitest';
import { editorialPersonaForCategory, findEditorialPersona } from '../src/config/editorialPersonas';

describe('editorial personas', () => {
    it.each([
        ['Lançamentos', 'Lucas Andrade'],
        ['Indústria', 'Marina Costa'],
        ['Rumores', 'Rafael Nunes'],
        ['E-Sports', 'Gabriel Martins']
    ])('routes %s to %s', (category, expected) => {
        expect(editorialPersonaForCategory(category).name).toBe(expected);
    });

    it('matches names without depending on case or accents', () => {
        expect(findEditorialPersona('marina costa')?.key).toBe('industry');
    });

    it('uses the games persona for a general or unknown category', () => {
        expect(editorialPersonaForCategory('Comunidade').key).toBe('games');
    });
});

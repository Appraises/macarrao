import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword, validateName } from '../src/utils/validation';
import { validateTermContent } from '../src/utils/validator';

describe('validateEmail', () => {
    it('should accept valid email formats', () => {
        expect(validateEmail('user@example.com')).toBe(true);
        expect(validateEmail('test.user@domain.co')).toBe(true);
        expect(validateEmail('user+tag@gmail.com')).toBe(true);
    });

    it('should reject invalid email formats', () => {
        expect(validateEmail('')).toBe(false);
        expect(validateEmail('notanemail')).toBe(false);
        expect(validateEmail('@domain.com')).toBe(false);
        expect(validateEmail('user@')).toBe(false);
        expect(validateEmail('user @domain.com')).toBe(false);
    });
});

describe('validatePassword', () => {
    it('should accept valid passwords', () => {
        expect(validatePassword('123456').valid).toBe(true);
        expect(validatePassword('strongPassword!').valid).toBe(true);
    });

    it('should reject passwords that are too short', () => {
        const result = validatePassword('12345');
        expect(result.valid).toBe(false);
        expect(result.message).toContain('6');
    });

    it('should reject passwords that are too long', () => {
        const result = validatePassword('a'.repeat(129));
        expect(result.valid).toBe(false);
        expect(result.message).toContain('128');
    });

    it('should reject empty/missing passwords', () => {
        expect(validatePassword('').valid).toBe(false);
        expect(validatePassword(null as any).valid).toBe(false);
        expect(validatePassword(undefined as any).valid).toBe(false);
    });
});

describe('validateName', () => {
    it('should accept valid names', () => {
        expect(validateName('Jo').valid).toBe(true);
        expect(validateName('Bruno Lopes').valid).toBe(true);
    });

    it('should reject names that are too short', () => {
        expect(validateName('A').valid).toBe(false);
        expect(validateName('').valid).toBe(false);
    });

    it('should reject names that are too long', () => {
        expect(validateName('a'.repeat(51)).valid).toBe(false);
    });

    it('should reject non-string values', () => {
        expect(validateName(null as any).valid).toBe(false);
        expect(validateName(undefined as any).valid).toBe(false);
    });
});

describe('validateTermContent', () => {
    it('does not treat a blocked sequence inside a legitimate word as profanity', () => {
        expect(validateTermContent(
            'Controle de ritmo',
            'Uma estrategia usada para controlar o ritmo de uma partida competitiva.'
        ).isValid).toBe(true);
    });

    it('still rejects a blocked term as a complete word', () => {
        expect(validateTermContent(
            'Termo ofensivo',
            'Esta definicao inclui merda como uma palavra isolada.'
        ).isValid).toBe(false);
    });
});

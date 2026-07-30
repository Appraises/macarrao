import { describe, expect, it } from 'vitest';
import {
    TurnstileVerificationError,
    validateTurnstileResponse,
} from '../src/services/turnstile';

describe('Turnstile response validation', () => {
    it('accepts only a successful response with the expected action and hostname', () => {
        expect(validateTurnstileResponse({
            success: true,
            action: 'register',
            hostname: 'LOCALHOST',
        }, 'register', ['localhost'])).toBe('localhost');
    });

    it.each([
        [{ success: false, action: 'register', hostname: 'localhost' }, 'register'],
        [{ success: true, action: 'contribution', hostname: 'localhost' }, 'register'],
        [{ success: true, action: 'register', hostname: 'attacker.example' }, 'register'],
    ] as const)('rejects invalid, cross-action or foreign-host responses', (response, action) => {
        expect(() => validateTurnstileResponse(response, action, ['localhost']))
            .toThrowError(TurnstileVerificationError);
    });
});

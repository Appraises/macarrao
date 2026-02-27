/**
 * Validates an email format using a standard regex pattern.
 */
export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validates password strength requirements.
 * Returns an object with validity and a user-facing message.
 */
export function validatePassword(password: string): { valid: boolean; message: string } {
    if (!password || typeof password !== 'string') {
        return { valid: false, message: 'A senha é obrigatória.' };
    }
    if (password.length < 6) {
        return { valid: false, message: 'A senha deve ter no mínimo 6 caracteres.' };
    }
    if (password.length > 128) {
        return { valid: false, message: 'A senha deve ter no máximo 128 caracteres.' };
    }
    return { valid: true, message: '' };
}

/**
 * Validates a user display name.
 */
export function validateName(name: string): { valid: boolean; message: string } {
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return { valid: false, message: 'O nome deve ter no mínimo 2 caracteres.' };
    }
    if (name.trim().length > 50) {
        return { valid: false, message: 'O nome deve ter no máximo 50 caracteres.' };
    }
    return { valid: true, message: '' };
}

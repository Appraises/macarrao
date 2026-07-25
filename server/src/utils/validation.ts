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
/**
 * Length is what actually makes a password hard to guess, so the rule is a longer
 * minimum rather than a symbol-and-uppercase dance that pushes people toward
 * "Senha123!". What length alone does not stop is someone picking a password that
 * every attacker tries first, hence the list below — the passwords that top every
 * leak, plus the ones this audience reaches for.
 */
const COMMON_PASSWORDS = new Set([
    '12345678', '123456789', '1234567890', '12341234', '123123123', '11111111', '00000000',
    'password', 'password1', 'password123', 'senha123', 'senhasenha', 'minhasenha',
    'qwertyui', 'qwerty123', 'asdfghjk', 'iloveyou', 'princess', 'sunshine', 'football',
    'baseball', 'superman', 'batman123', 'pokemon1', 'starwars', 'dragonball',
    'brasil123', 'brasil2026', 'flamengo', 'corinthians', 'palmeiras', 'saopaulo',
    'gamer123', 'gaming123', 'minecraft', 'fortnite', 'valorant', 'counterstrike',
    'leagueoflegends', 'freefire', 'dicionario', 'dicionariogamer', 'admin123', 'administrador'
]);

export function validatePassword(password: string): { valid: boolean; message: string } {
    if (!password || typeof password !== 'string') {
        return { valid: false, message: 'A senha é obrigatória.' };
    }
    if (password.length < 8) {
        return { valid: false, message: 'A senha deve ter no mínimo 8 caracteres.' };
    }
    if (password.length > 128) {
        return { valid: false, message: 'A senha deve ter no máximo 128 caracteres.' };
    }
    if (COMMON_PASSWORDS.has(password.toLowerCase())) {
        return { valid: false, message: 'Essa senha é uma das mais usadas do mundo e seria adivinhada rapidamente. Escolha outra.' };
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

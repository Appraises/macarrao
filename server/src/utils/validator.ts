
export const validateTermContent = (word: string, definition: string): { isValid: boolean; error?: string } => {
    // 1. Basic Length Checks
    if (!word || word.length < 2) {
        return { isValid: false, error: 'O termo deve ter pelo menos 2 caracteres.' };
    }
    if (!definition || definition.length < 10) {
        return { isValid: false, error: 'A definição deve ter pelo menos 10 caracteres.' };
    }
    if (word.length > 50) {
        return { isValid: false, error: 'O termo é muito longo (máximo 50 caracteres).' };
    }
    if (definition.length > 500) {
        return { isValid: false, error: 'A definição é muito longa (máximo 500 caracteres).' };
    }

    // 2. URL and HTML Detection (Anti-Spam/Security)
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(\.[a-z]{2,}\/)/i;
    if (urlRegex.test(word) || urlRegex.test(definition)) {
        return { isValid: false, error: 'Não é permitido incluir links (URLs) no termo ou definição.' };
    }

    const htmlRegex = /<[^>]*>/;
    if (htmlRegex.test(word) || htmlRegex.test(definition)) {
        return { isValid: false, error: 'Não é permitido incluir tags HTML.' };
    }

    // 3. Repetitive Patterns
    // Characters: "aaaaa", "!!!!!!"
    if (/(.)\1{4,}/.test(word) || /(.)\1{4,}/.test(definition)) {
        return { isValid: false, error: 'O texto contém caracteres repetidos excessivamente.' };
    }
    // Words: "teste teste teste"
    if (/\b(\w+)\s+\1\s+\1\b/i.test(definition)) {
        return { isValid: false, error: 'A definição contém palavras repetidas excessivamente.' };
    }

    // 4. Special Character Ratio (Gibberish Detector)
    // If > 40% of the string is non-alphanumeric (excluding spaces), it's likely spam/gibberish
    const getSpecialCharRatio = (text: string) => {
        const clean = text.replace(/\s/g, '');
        if (clean.length === 0) return 0;
        const special = clean.replace(/[a-zA-Z0-9À-ÿ]/g, '').length;
        return special / clean.length;
    };

    if (getSpecialCharRatio(word) > 0.4 || getSpecialCharRatio(definition) > 0.4) {
        return { isValid: false, error: 'O texto contém excesso de símbolos ou caracteres especiais.' };
    }

    // 5. Excessive Capitalization
    const isUpper = (text: string) => text === text.toUpperCase() && text !== text.toLowerCase();
    // Allow short acronyms (e.g., "FPS", "MMORPG") but flag longer texts
    if (definition.length > 20 && isUpper(definition)) {
        return { isValid: false, error: 'A definição não deve ser escrita inteiramente em maiúsculas.' };
    }

    // 6. Expanded Blocked Words List (Profanity & Spam)
    const blockedWords = [
        // Common Spam/Test/System
        'spam', 'teste', 'test', 'admin', 'root', 'moderator', 'system', 'null', 'undefined', 'void',
        'helpdesk', 'staff', 'gm', 'gamemaster', 'god', 'dev', 'developer',

        // Portuguese Profanity & Insults (Expanded)
        'caralho', 'porra', 'merda', 'boceta', 'fuder', 'puta', 'puto', 'caralhos',
        'buceta', 'cu', 'cuzão', 'pinto', 'pau', 'rola', 'cacete', 'foda', 'foder',
        'fodase', 'foda-se', 'piroca', 'transar', 'sexo', 'boquete', 'siririca',
        'arrombado', 'arrombada', 'vagabundo', 'vagabunda', 'idiota', 'imbecil',
        'burro', 'burra', 'retardado', 'retardada', 'viado', 'bicha', 'gay', 'sapatão',
        'corno', 'corna', 'chupa', 'chupar', 'mamar', 'gozar', 'gozo', 'orgasmo',
        'xota', 'xoxota', 'grelo', 'clitoris', 'penis', 'vagina', 'anal', 'oral',
        'suruba', 'incesto', 'pedofilia', 'pedofilo', 'estupro', 'estuprador',
        'masturbar', 'masturbacao', 'punheta', 'bronha',
        'fdp', 'pqp', 'vsf', 'tnc', 'vtnc', 'krl', 'kralho', 'vtmnc',
        'trouxa', 'otário', 'otaria', 'babaca', 'lixo', 'inútil', 'mongol', 'mongoloide',
        'macaco', 'macaca', 'nazista', 'nazismo', 'hitler', 'suicida', 'suicidio', 'terrorista',
        'boçal', 'besta', 'jumento', 'verme', 'escroto', 'escrota',
        'vadia', 'piranha', 'kenga', 'quenga', 'rapariga', 'biscate',
        'chupada', 'trepar', 'fudido', 'fudida', 'corno', 'chifrudo',

        // Gambling & Scams & Contact Info
        'cassino', 'bet', 'aposta', 'apostas', 'blaze', 'tigrinho', 'aviator',
        'bitcoin', 'cripto', 'crypto', 'wallet', 'trader', 'forex', 'binance',
        'renda extra', 'ganhar dinheiro',
        'pix', 'chave pix', 'transferencia',
        'whatsapp', 'zap', 'telegram', 'instagram', 'insta', 'facebook', 'twitter',
        'contato', 'email', 'gmail', 'hotmail',

        // Drugs (Context dependent, but usually safe to block for general terms)
        'maconha', 'cocaina', 'crack', 'heroina', 'lsd', 'ecstasy', 'trafico',
        'loló', 'lança perfume', 'pino', 'bucha',

        // English Profanity & Slurs
        'fuck', 'shit', 'bitch', 'ass', 'dick', 'cock', 'pussy', 'nigger', 'faggot',
        'cunt', 'whore', 'slut', 'bastard', 'sucker', 'motherfucker', 'wanker',
        'retard', 'autist', 'kys', 'kill yourself', 'suicide', 'rape', 'rapist',
        'sex', 'porn', 'xxx', 'nudes', 'hentai', 'camgirl', 'onlyfans',
        'cum', 'jizz', 'tit', 'tits', 'boobs', 'milf'
    ];

    // Helper to normalize Leetspeak (Basic)
    const normalizeText = (text: string) => {
        return text.toLowerCase()
            .replace(/3/g, 'e')
            .replace(/4/g, 'a')
            .replace(/@/g, 'a')
            .replace(/1/g, 'i')
            .replace(/!/g, 'i')
            .replace(/0/g, 'o')
            .replace(/\$/g, 's')
            .replace(/5/g, 's')
            .replace(/7/g, 't')
            .replace(/\+/g, 't')
            .replace(/v/g, 'u') // sometimes used
            .replace(/z/g, 's');
    };

    const containsBlockedWord = (text: string) => {
        const lower = text.toLowerCase();
        const normalized = normalizeText(lower);

        // Check both original and normalized versions
        return blockedWords.some(bad => {
            // Use word boundary for short words
            if (bad.length <= 3) {
                const regex = new RegExp(`\\b${bad}\\b`, 'i');
                return regex.test(lower) || regex.test(normalized);
            }
            return lower.includes(bad) || normalized.includes(bad);
        });
    };

    if (containsBlockedWord(word) || containsBlockedWord(definition)) {
        return { isValid: false, error: 'O conteúdo contém palavras proibidas ou impróprias.' };
    }

    return { isValid: true };
};

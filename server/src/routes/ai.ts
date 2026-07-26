import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { cleanPlainText } from '../utils/content';
import { validateTermContent } from '../utils/validator';

const router = Router();

/**
 * Pre-submit quality check for a contribution.
 *
 * This used to call Gemini. It was dropped for three reasons: it put a paid external
 * dependency on the critical contribution path, it degraded to "always valid" whenever
 * the key was absent (so in practice it did nothing), and the local validator already
 * catches what actually matters — spam, links, HTML, gibberish, caps and profanity.
 * What remains are quality heuristics that give the contributor specific feedback.
 *
 * The route path is unchanged so existing clients keep working.
 */

interface QualityHint {
    /** Blocks submission when false. */
    isValid: boolean;
    feedback?: string;
}

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

const qualityCheck = (word: string, definition: string): QualityHint => {
    const lowerWord = word.toLowerCase().trim();
    const lowerDefinition = definition.toLowerCase().trim();

    // A definition that is just the word again teaches nothing.
    if (lowerDefinition.replace(/[^a-zà-ÿ\s]/gi, '').trim() === lowerWord) {
        return { isValid: false, feedback: 'A definicao nao pode ser apenas a repeticao do termo. Explique o que ele significa.' };
    }

    // Circular: "gank e gank", "rush significa rush".
    const escaped = lowerWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (escaped && new RegExp(`^${escaped}\\s+(e|eh|é|significa|quer dizer)\\s+${escaped}\\b`).test(lowerDefinition)) {
        return { isValid: false, feedback: 'A definicao esta circular. Descreva o significado sem repetir o proprio termo.' };
    }

    if (wordCount(definition) < 4) {
        return { isValid: false, feedback: 'A definicao esta curta demais. Explique em pelo menos uma frase completa.' };
    }

    // Soft hints: accepted, but nudge toward a better entry.
    if (wordCount(definition) < 8) {
        return { isValid: true, feedback: 'Dica: definicoes com mais contexto (quando e como o termo e usado) sao aprovadas mais rapido.' };
    }

    return { isValid: true };
};

router.post('/validate-contribution', authenticateToken, async (req: any, res: any) => {
    const word = cleanPlainText(req.body?.word);
    const definition = cleanPlainText(req.body?.definition);

    // Hard rules first: length, links, HTML, gibberish, caps, blocked words.
    const validation = validateTermContent(word, definition);
    if (!validation.isValid) return res.status(400).json({ error: validation.error });

    res.json(qualityCheck(word, definition));
});

export default router;

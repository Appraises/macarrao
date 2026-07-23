import { Router } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { authenticateToken } from '../middleware/auth';
import { cleanPlainText } from '../utils/content';
import { validateTermContent } from '../utils/validator';

const router = Router();

const getClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.warn('GEMINI_API_KEY not set — AI features disabled');
        return null;
    }
    return new GoogleGenAI({ apiKey });
};

// Validate a user contribution using Gemini
router.post('/validate-contribution', authenticateToken, async (req: any, res: any) => {
    const word = cleanPlainText(req.body?.word);
    const definition = cleanPlainText(req.body?.definition);
    const validation = validateTermContent(word, definition);
    if (!validation.isValid) return res.status(400).json({ error: validation.error });

    const ai = getClient();
    if (!ai) {
        return res.json({ isValid: true, feedback: 'API indisponível, submissão aceita preliminarmente.' });
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze this user submission for a gaming dictionary. Word: "${word}". Definition: "${definition}". Is this a valid gaming term and is the definition accurate/appropriate?`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        isValid: { type: Type.BOOLEAN },
                        feedback: { type: Type.STRING, description: 'Short reason in PT-BR' }
                    }
                }
            }
        });

        const text = response.text;
        res.json(text ? JSON.parse(text) : { isValid: false, feedback: 'Erro na validação.' });
    } catch (error) {
        console.error('Error validating contribution:', error);
        res.json({ isValid: true, feedback: 'Erro de conexão, salvo para revisão manual.' });
    }
});

export default router;

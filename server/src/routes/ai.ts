import { Router } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { authenticateToken } from '../middleware/auth';

const router = Router();

const getClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.warn('GEMINI_API_KEY not set — AI features disabled');
        return null;
    }
    return new GoogleGenAI({ apiKey });
};

// Generate a term definition using Gemini
router.post('/generate-definition', authenticateToken, async (req: any, res: any) => {
    const { term } = req.body;

    if (!term || typeof term !== 'string' || term.trim().length === 0) {
        return res.status(400).json({ error: 'O campo "term" é obrigatório.' });
    }

    const ai = getClient();
    if (!ai) {
        return res.status(503).json({ error: 'Serviço de IA indisponível. GEMINI_API_KEY não configurada.' });
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Define the gaming term "${term}" in Portuguese (Brazil). If the term has multiple meanings in different games, explain the most common one but mention context. Provide pronunciation, examples, and related terms.`,
            config: {
                systemInstruction: 'You are a specialized dictionary editor for video games and esports in Brazil. Your tone is professional yet accessible to gamers. You prefer Brazilian Portuguese gaming slang conventions.',
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        word: { type: Type.STRING },
                        definition: { type: Type.STRING, description: 'Concise definition in PT-BR' },
                        phonetic: { type: Type.STRING, description: 'IPA notation' },
                        pronunciationGuide: { type: Type.STRING, description: 'Simplified phonetic reading for Brazilians' },
                        examples: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: '2-3 usage examples in sentences'
                        },
                        relatedTerms: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                        tags: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ['word', 'definition', 'examples', 'relatedTerms', 'tags']
                }
            }
        });

        const text = response.text;
        if (!text) {
            return res.status(500).json({ error: 'Resposta vazia da IA.' });
        }

        const data = JSON.parse(text);
        res.json({
            ...data,
            id: `gen-${Date.now()}`,
            upvotes: 0,
            downvotes: 0,
            verified: false
        });
    } catch (error) {
        console.error('Error generating term definition:', error);
        res.status(500).json({ error: 'Falha ao gerar definição.' });
    }
});

// Validate a user contribution using Gemini
router.post('/validate-contribution', authenticateToken, async (req: any, res: any) => {
    const { word, definition } = req.body;

    if (!word || !definition) {
        return res.status(400).json({ error: '"word" e "definition" são obrigatórios.' });
    }

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

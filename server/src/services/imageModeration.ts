import { IMAGE_MODERATION_API_KEY, IMAGE_MODERATION_ENABLED, IMAGE_MODERATION_PROVIDER } from '../utils/config';

export interface ScreenResult {
    /** false = the pre-screen judged the image unsafe (route to admin, not the owner). */
    safe: boolean;
    /** Short machine reason when flagged, e.g. "adult:VERY_LIKELY". */
    reason?: string;
}

const SAFE: ScreenResult = { safe: true };

/**
 * Optional SafeSearch pre-screen for uploaded images. It never blocks the upload —
 * the image is PENDING regardless — it only decides whether the image is safe enough
 * to reach the term owner, or must be held for admin review.
 *
 * Off by default (returns safe). When enabled with a provider + key, it calls the
 * provider. Any error fails SAFE-CLOSED: treat as unsafe so a human looks at it.
 */
export const screenImage = async (buffer: Buffer, mimeType: string): Promise<ScreenResult> => {
    if (!IMAGE_MODERATION_ENABLED || !IMAGE_MODERATION_API_KEY) return SAFE;

    try {
        if (IMAGE_MODERATION_PROVIDER === 'google') return await screenWithGoogleVision(buffer);
        console.warn(`[imageModeration] Provider desconhecido: ${IMAGE_MODERATION_PROVIDER}. Marcando para revisao.`);
        return { safe: false, reason: 'provider-unknown' };
    } catch (error) {
        console.error('[imageModeration] Falha no pre-filtro, marcando para revisao:', error instanceof Error ? error.message : error);
        return { safe: false, reason: 'screen-error' };
    }
};

// Google Cloud Vision SafeSearch. Flags adult and violence at LIKELY/VERY_LIKELY.
// https://cloud.google.com/vision/docs/detecting-safe-search
const RISKY = new Set(['LIKELY', 'VERY_LIKELY']);

const screenWithGoogleVision = async (buffer: Buffer): Promise<ScreenResult> => {
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${IMAGE_MODERATION_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            requests: [{
                image: { content: buffer.toString('base64') },
                features: [{ type: 'SAFE_SEARCH_DETECTION' }],
            }],
        }),
    });
    if (!response.ok) throw new Error(`Vision HTTP ${response.status}`);
    const data = await response.json() as {
        responses?: Array<{ safeSearchAnnotation?: Record<string, string> }>;
    };
    const annotation = data.responses?.[0]?.safeSearchAnnotation || {};
    for (const category of ['adult', 'violence', 'racy'] as const) {
        if (RISKY.has(annotation[category])) return { safe: false, reason: `${category}:${annotation[category]}` };
    }
    return SAFE;
};

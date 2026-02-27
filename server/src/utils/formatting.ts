
/**
 * Safely converts a tags value to a string array.
 * Handles both Json (array) and legacy string formats.
 */
export const parseTags = (tags: unknown): string[] => {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags as string[];
    if (typeof tags === 'string') {
        try {
            const parsed = JSON.parse(tags);
            if (Array.isArray(parsed)) return parsed;
        } catch (e) {
            // Fall back to comma-separated
        }
        return tags.split(',').map(t => t.trim()).filter(t => t);
    }
    return [];
};

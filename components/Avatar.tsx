import React from 'react';
import BoringAvatar from 'boring-avatars';

// Palette used for generated avatars — vibrant, reads well on the dark UI.
const PALETTE = ['#0EA5E9', '#22D3EE', '#818CF8', '#C084FC', '#F472B6'];

interface AvatarProps {
    /** Seed for the generated avatar (usually the user's name). */
    name: string;
    /** A real, user-uploaded image. Ignored when it's a generated placeholder. */
    src?: string | null;
    size?: number;
    className?: string;
}

// Only treat http(s) images that aren't a known placeholder generator as custom.
const isCustomImage = (src?: string | null) =>
    !!src && /^https?:\/\//.test(src) && !src.includes('api.dicebear.com');

/**
 * Deterministic gradient avatar (HuggingFace/GitHub-style identicon) generated
 * from the name, or the user's real photo when they have one. SVG is inline —
 * no external request.
 */
export const Avatar: React.FC<AvatarProps> = ({ name, src, size = 32, className = '' }) => {
    if (isCustomImage(src)) {
        return (
            <img
                src={src!}
                alt={name}
                className={`rounded-full object-cover ${className}`}
                style={{ width: size, height: size }}
            />
        );
    }
    return (
        <span
            className={`inline-flex overflow-hidden rounded-full ${className}`}
            style={{ width: size, height: size }}
            role="img"
            aria-label={name}
        >
            <BoringAvatar name={name} variant="marble" size={size} colors={PALETTE} />
        </span>
    );
};

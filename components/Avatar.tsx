import React from 'react';
import BoringAvatar from 'boring-avatars';

// Palette used for generated avatars — vibrant, reads well on the dark UI.
export const AVATAR_PALETTE = ['#0EA5E9', '#22D3EE', '#818CF8', '#C084FC', '#F472B6'];

interface AvatarProps {
    /** Seed for the generated avatar (usually the user's name). */
    name: string;
    /** A real, user-uploaded image. Ignored when it's a generated placeholder. */
    src?: string | null;
    size?: number;
    className?: string;
    /** Shape of the generated identicon (a real photo always follows the container). */
    square?: boolean;
}

// Avatar-generator services whose URLs are placeholders, not real user photos, so we
// replace them with our own gradient identicon. dicebear = cartoon people,
// ui-avatars = initials, gravatar's default = mystery-person.
const PLACEHOLDER_HOSTS = ['api.dicebear.com', 'ui-avatars.com', 'avatars.dicebear.com'];

/** A real, uploaded photo — anything that isn't a known generator URL. */
export const isCustomImage = (src?: string | null): src is string =>
    !!src && /^https?:\/\//.test(src) && !PLACEHOLDER_HOSTS.some((host) => src.includes(host));

/**
 * Deterministic gradient avatar (HuggingFace/GitHub-style identicon) generated
 * from the name, or the user's real photo when they have one. SVG is inline —
 * no external request.
 */
export const Avatar: React.FC<AvatarProps> = ({ name, src, size = 32, className = '', square = false }) => {
    const shape = square ? 'rounded-2xl' : 'rounded-full';
    if (isCustomImage(src)) {
        return (
            <img
                src={src}
                alt={name}
                className={`${shape} object-cover ${className}`}
                style={{ width: size, height: size }}
            />
        );
    }
    return (
        <span
            className={`inline-flex overflow-hidden ${shape} ${className}`}
            style={{ width: size, height: size }}
            role="img"
            aria-label={name}
        >
            <BoringAvatar name={name} variant="marble" size={size} square={square} colors={AVATAR_PALETTE} />
        </span>
    );
};

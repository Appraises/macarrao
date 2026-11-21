import React, { useState } from 'react';

interface EsportsMarkProps {
    src?: string | null;
    alt: string;
    fallback: React.ReactNode;
    className: string;
    cover?: boolean;
}

export const EsportsMark: React.FC<EsportsMarkProps> = ({ src, alt, fallback, className, cover }) => {
    const [failed, setFailed] = useState<string | null>(null);
    return (
        <span className={`grid shrink-0 place-items-center overflow-hidden ${className}`}>
            {src && failed !== src
                ? <img src={src} alt={alt} onError={() => setFailed(src)} className={`h-full w-full ${cover ? 'object-cover' : 'object-contain'}`} />
                : <span aria-hidden="true" className="grid h-full w-full place-items-center">{fallback}</span>}
        </span>
    );
};

import React, { useState } from 'react';
import { Shield } from 'lucide-react';

interface TeamCrestProps {
    logo?: string | null;
    pending?: boolean;
    compact?: boolean;
}

export const TeamCrest: React.FC<TeamCrestProps> = ({ logo, pending = false, compact = false }) => {
    const [failedLogo, setFailedLogo] = useState<string | null>(null);
    const size = compact ? 18 : 24;
    const sizeClass = compact ? 'h-[18px] w-[18px]' : 'h-6 w-6';
    if (!pending && logo && failedLogo !== logo) {
        return <img src={logo} alt="" width={size} height={size} decoding="async" onError={() => setFailedLogo(logo)} className={`${sizeClass} shrink-0 object-contain`} />;
    }
    return <span aria-hidden="true" className={`${sizeClass} grid shrink-0 place-items-center text-xs text-gray-500`}>
        {pending ? '–' : <Shield size={compact ? 13 : 16} />}
    </span>;
};

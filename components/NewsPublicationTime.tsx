import React from 'react';
import { CalendarDays, Clock } from 'lucide-react';
import type { News } from '../types';

const timeZone = 'America/Sao_Paulo';
const compactFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short', timeZone });
const fullFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short', timeZone });

interface NewsPublicationTimeProps {
    news: Pick<News, 'publishedAt' | 'createdAt'>;
    compact?: boolean;
}

export const NewsPublicationTime: React.FC<NewsPublicationTimeProps> = ({ news, compact = false }) => {
    const published = Date.parse(news.publishedAt ?? '');
    const timestamp = Number.isFinite(published) ? published : Date.parse(news.createdAt ?? '');
    if (!Number.isFinite(timestamp)) return null;

    const fullDate = fullFormat.format(timestamp);
    const Icon = compact ? Clock : CalendarDays;
    return (
        <time
            dateTime={new Date(timestamp).toISOString()}
            title={`${fullDate} (horário de Brasília)`}
            className="inline-flex items-center gap-1.5"
        >
            <Icon size={compact ? 12 : 14} className="shrink-0" aria-hidden="true" />
            <span>{compact ? compactFormat.format(timestamp) : fullDate}</span>
        </time>
    );
};

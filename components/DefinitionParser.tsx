import React from 'react';
import { Link } from 'react-router-dom';

interface DefinitionParserProps {
    text: string;
    keywords?: string[];
}

export const DefinitionParser: React.FC<DefinitionParserProps> = ({ text, keywords }) => {
    if (!text) return null;
    if (!keywords || keywords.length === 0) return <>{text}</>;

    // Escape special regex characters in keywords to prevent errors
    const escapedKeywords = keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    // Create a regex pattern to match any of the keywords (case-insensitive)
    const pattern = new RegExp(`\\b(${escapedKeywords.join('|')})\\b`, 'gi');

    // Split the text by the pattern, keeping the delimiters (matched keywords)
    const parts = text.split(pattern);

    return (
        <>
            {parts.map((part, index) => {
                // Check if this part matches any keyword (case-insensitive)
                const matchedKeyword = keywords.find(k => k.toLowerCase() === part.toLowerCase());

                if (matchedKeyword) {
                    return (
                        <Link
                            key={index}
                            to={`/term/${matchedKeyword.toLowerCase()}`} // Assuming slug is lowercase
                            className="text-brand-400 font-bold hover:text-brand-300 hover:underline transition-colors"
                            title={`Ver definição de ${matchedKeyword}`}
                        >
                            {part}
                        </Link>
                    );
                }

                return <span key={index}>{part}</span>;
            })}
        </>
    );
};

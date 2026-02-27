import React, { useState } from 'react';
import { Book, MessageSquare } from 'lucide-react';
import { Term, Comment } from '../../types';

interface ActivitySectionProps {
    terms: Term[];
    comments: Comment[];
}

export const ActivitySection: React.FC<ActivitySectionProps> = ({ terms, comments }) => {
    const [activeTab, setActiveTab] = useState<'words' | 'comments'>('words');

    return (
        <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden min-h-[400px]">
            <div className="flex border-b border-dark-700">
                <button
                    onClick={() => setActiveTab('words')}
                    className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'words'
                        ? 'bg-dark-800 text-brand-500 border-b-2 border-brand-500'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-dark-800/50'
                        }`}
                >
                    Palavras Recentes
                </button>
                <button
                    onClick={() => setActiveTab('comments')}
                    className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'comments'
                        ? 'bg-dark-800 text-brand-500 border-b-2 border-brand-500'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-dark-800/50'
                        }`}
                >
                    Comentários Recentes
                </button>
            </div>

            <div className="p-6">
                {activeTab === 'words' ? (
                    <div className="space-y-4">
                        {terms.length > 0 ? (
                            terms.map(term => (
                                <div key={term.id} className="bg-dark-950/50 border border-dark-700/50 rounded-lg p-4 hover:border-brand-500/30 transition-all group cursor-pointer">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded bg-brand-500/10 flex items-center justify-center flex-shrink-0 text-brand-500 group-hover:bg-brand-500 group-hover:text-black transition-colors">
                                            <Book className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold group-hover:text-brand-400 transition-colors">{term.word}</h4>
                                            <p className="text-sm text-gray-400 mt-1 line-clamp-2">{term.definition}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12">
                                <Book className="w-12 h-12 text-dark-700 mx-auto mb-4" />
                                <p className="text-gray-500">Nenhuma palavra contribuída ainda.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {comments.length > 0 ? (
                            comments.map(comment => (
                                <div key={comment.id} className="bg-dark-950/50 border border-dark-700/50 rounded-lg p-4 hover:border-brand-500/30 transition-all group cursor-pointer">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded bg-blue-500/10 flex items-center justify-center flex-shrink-0 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                            <MessageSquare className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-gray-300 text-sm italic mb-2">"{comment.content}"</p>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span>Em resposta a uma notícia</span>
                                                <span>•</span>
                                                <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12">
                                <MessageSquare className="w-12 h-12 text-dark-700 mx-auto mb-4" />
                                <p className="text-gray-500">Nenhum comentário feito ainda.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

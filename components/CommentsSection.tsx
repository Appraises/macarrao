import React, { useState, useEffect } from 'react';
import { User, ThumbsUp, MessageSquare, Send, LogIn } from 'lucide-react';
import { Button } from './UI';
import { useAuth } from "../src/context/AuthContext";
import { getComments, createComment } from "../src/services/api";
import { Link } from 'react-router-dom';

interface Comment {
    id: string;
    content: string;
    createdAt: string;
    likes: number;
    user: {
        name: string;
        avatar: string | null;
    };
}

export const CommentsSection: React.FC<{ newsId?: string }> = ({ newsId }) => {
    const { user, isAuthenticated } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (newsId) {
            fetchComments();
        }
    }, [newsId]);

    const fetchComments = async () => {
        try {
            if (!newsId) return;
            const data = await getComments(newsId);
            setComments(data);
        } catch (error) {
            console.error('Failed to fetch comments:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !newsId) return;

        setLoading(true);
        try {
            await createComment(newsId, newComment);
            setNewComment('');
            fetchComments(); // Refresh list
        } catch (error) {
            console.error('Failed to post comment:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    return (
        <div className="bg-dark-900/30 border-t border-white/5 pt-12 mt-12">
            <div className="max-w-4xl mx-auto">

                <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                    <MessageSquare className="w-6 h-6 text-brand-500" />
                    Comentários <span className="text-gray-500 text-lg font-normal">({comments.length})</span>
                </h3>

                {/* Add Comment Form */}
                {isAuthenticated ? (
                    !user?.emailVerified ? (
                        <div className="mb-12 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-8 text-center">
                            <h4 className="text-yellow-400 font-bold mb-2">Verificação Necessária</h4>
                            <p className="text-gray-400 mb-4">Para comentar nas notícias, você precisa verificar seu email.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="mb-12 bg-dark-900 border border-dark-700 rounded-xl p-6">
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    {user?.avatar ? (
                                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-5 h-5 text-brand-500" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <textarea
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="O que você achou desta notícia?"
                                        className="w-full bg-dark-950 border border-dark-700 rounded-lg p-4 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 min-h-[100px] resize-y transition-all"
                                    />
                                    <div className="flex justify-end mt-3">
                                        <Button type="submit" disabled={!newComment.trim() || loading}>
                                            <Send className="w-4 h-4" />
                                            {loading ? 'Enviando...' : 'Publicar Comentário'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    )
                ) : (
                    <div className="mb-12 bg-dark-900/50 border border-dark-800 rounded-xl p-8 text-center">
                        <p className="text-gray-400 mb-4">Você precisa estar logado para comentar.</p>
                        <Link to="/login">
                            <Button variant="outline">
                                <LogIn className="w-4 h-4" />
                                Fazer Login
                            </Button>
                        </Link>
                    </div>
                )}

                {/* Comments List */}
                <div className="space-y-6">
                    {comments.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">Seja o primeiro a comentar!</p>
                    ) : (
                        comments.map((comment) => (
                            <div key={comment.id} className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="w-10 h-10 rounded-full bg-dark-800 border border-dark-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    {comment.user.avatar ? (
                                        <img src={comment.user.avatar} alt={comment.user.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-5 h-5 text-gray-400" />
                                    )}
                                </div>

                                <div className="flex-1">
                                    <div className="bg-dark-900/50 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-bold text-white text-sm">{comment.user.name}</h4>
                                            <span className="text-xs text-gray-500">{formatDate(comment.createdAt)}</span>
                                        </div>
                                        <p className="text-gray-300 text-sm leading-relaxed">{comment.content}</p>
                                    </div>

                                    <div className="flex items-center gap-4 mt-2 ml-2">
                                        <button className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-brand-400 transition-colors group">
                                            <ThumbsUp className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                            {comment.likes} Curtidas
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

            </div>
        </div>
    );
};

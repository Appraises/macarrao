import React, { useState, useEffect } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';
import { Button } from '../../components/UI';
import { getPendingTerms, verifyTerm, rejectTerm } from '../../src/services/api';

interface PendingTerm {
    id: string;
    word: string;
    definition: string;
    author: string;
    game: { name: string } | null;
    createdAt: string;
}

export const Contributions: React.FC = () => {
    const [pendingTerms, setPendingTerms] = useState<PendingTerm[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTerms();
    }, []);

    const loadTerms = async () => {
        try {
            const data = await getPendingTerms();
            setPendingTerms(data);
        } catch (error) {
            console.error('Failed to load terms', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (id: string) => {
        try {
            await verifyTerm(id);
            setPendingTerms(prev => prev.filter(t => t.id !== id));
        } catch (error) {
            alert('Erro ao aceitar termo');
        }
    };

    const handleReject = async (id: string) => {
        if (!confirm('Tem certeza que deseja rejeitar este termo?')) return;
        try {
            await rejectTerm(id);
            setPendingTerms(prev => prev.filter(t => t.id !== id));
        } catch (error) {
            alert('Erro ao rejeitar termo');
        }
    };

    if (loading) return <div className="text-white">Carregando...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-2xl font-bold text-white font-display">Contribuições Pendentes</h2>
                <p className="text-gray-400 text-sm">Revise e aprove as sugestões da comunidade</p>
            </div>

            {pendingTerms.length === 0 ? (
                <div className="bg-dark-900 border border-white/5 p-12 rounded-xl text-center">
                    <div className="w-16 h-16 bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="w-8 h-8 text-green-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Tudo Limpo!</h3>
                    <p className="text-gray-500">Não há contribuições pendentes no momento.</p>
                </div>
            ) : (
                <div className="bg-dark-900 border border-white/5 rounded-xl overflow-hidden shadow-lg">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-dark-950 border-b border-white/5 text-xs uppercase tracking-wider text-gray-500 font-bold">
                                    <th className="p-4">Palavra</th>
                                    <th className="p-4">Definição</th>
                                    <th className="p-4">Jogo</th>
                                    <th className="p-4">Autor</th>
                                    <th className="p-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {pendingTerms.map((term) => (
                                    <tr key={term.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-4 font-bold text-white">{term.word}</td>
                                        <td className="p-4 text-gray-400 max-w-xs truncate" title={term.definition}>{term.definition}</td>
                                        <td className="p-4 text-brand-400 text-sm">{term.game?.name || 'Geral'}</td>
                                        <td className="p-4 text-gray-500 text-sm">{term.author || 'Anônimo'}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleAccept(term.id)}
                                                    className="p-2 bg-green-500/10 text-green-400 rounded hover:bg-green-500 hover:text-white transition-all"
                                                    title="Aceitar"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleReject(term.id)}
                                                    className="p-2 bg-red-500/10 text-red-400 rounded hover:bg-red-500 hover:text-white transition-all"
                                                    title="Rejeitar"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

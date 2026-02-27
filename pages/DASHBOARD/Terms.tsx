import React, { useEffect, useState } from 'react';
import { getAllTerms, updateTerm } from '../../src/services/api';
import { Term } from '../../types';
import { Search, CheckCircle, XCircle, ThumbsUp, ThumbsDown, Book, Pencil, X } from 'lucide-react';
import { Badge, Button } from '../../components/UI';

export const TermsList: React.FC = () => {
    const [terms, setTerms] = useState<Term[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingTerm, setEditingTerm] = useState<Term | null>(null);
    const [editForm, setEditForm] = useState({ word: '', definition: '', tags: '' });

    const fetchTerms = () => {
        setLoading(true);
        getAllTerms()
            .then(setTerms)
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchTerms();
    }, []);

    const handleEditClick = (term: Term) => {
        setEditingTerm(term);
        setEditForm({
            word: term.word,
            definition: term.definition,
            tags: term.tags.join(', ')
        });
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTerm) return;

        try {
            await updateTerm(editingTerm.id, {
                ...editForm,
                tags: editForm.tags.split(',').map(t => t.trim()).filter(Boolean)
            });
            setEditingTerm(null);
            fetchTerms();
        } catch (error) {
            console.error("Failed to update term", error);
            alert("Falha ao atualizar termo.");
        }
    };

    const filteredTerms = terms.filter(term =>
        term.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
        term.definition.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500 relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white font-display">Palavras Cadastradas</h2>
                    <p className="text-gray-400 text-sm">Gerencie o dicionário de termos</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Buscar termo..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="bg-dark-900 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-brand-500 w-full md:w-64"
                    />
                </div>
            </div>

            <div className="bg-dark-900 border border-white/5 rounded-xl overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5 text-xs uppercase tracking-wider text-gray-400 font-bold">
                                <th className="p-4">Termo</th>
                                <th className="p-4">Definição</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Votos</th>
                                <th className="p-4">Tags</th>
                                <th className="p-4">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">Carregando termos...</td>
                                </tr>
                            ) : filteredTerms.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">Nenhum termo encontrado.</td>
                                </tr>
                            ) : (
                                filteredTerms.map(term => (
                                    <tr key={term.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-dark-800 flex items-center justify-center border border-dark-700">
                                                    <Book className="w-5 h-5 text-brand-500" />
                                                </div>
                                                <span className="font-bold text-white">{term.word}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-400 text-sm max-w-xs truncate" title={term.definition}>
                                            {term.definition}
                                        </td>
                                        <td className="p-4">
                                            {term.verified ? (
                                                <Badge color="green" className="flex items-center gap-1 w-fit">
                                                    <CheckCircle className="w-3 h-3" /> Verificado
                                                </Badge>
                                            ) : (
                                                <Badge color="yellow" className="flex items-center gap-1 w-fit">
                                                    <XCircle className="w-3 h-3" /> Pendente
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3 text-sm">
                                                <span className="flex items-center gap-1 text-green-400">
                                                    <ThumbsUp className="w-3 h-3" /> {term.upvotes}
                                                </span>
                                                <span className="flex items-center gap-1 text-red-400">
                                                    <ThumbsDown className="w-3 h-3" /> {term.downvotes}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex gap-1 flex-wrap">
                                                {term.tags.slice(0, 2).map((tag, i) => (
                                                    <span key={i} className="text-xs bg-white/5 px-2 py-1 rounded text-gray-400">{tag}</span>
                                                ))}
                                                {term.tags.length > 2 && (
                                                    <span className="text-xs bg-white/5 px-2 py-1 rounded text-gray-400">+{term.tags.length - 2}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => handleEditClick(term)}
                                                className="text-gray-500 hover:text-brand-400 transition-colors p-2 hover:bg-white/5 rounded-lg"
                                                title="Editar"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {editingTerm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-dark-900 border border-white/10 rounded-xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-white/5">
                            <h3 className="text-xl font-bold text-white">Editar Termo</h3>
                            <button onClick={() => setEditingTerm(null)} className="text-gray-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Termo</label>
                                <input
                                    type="text"
                                    required
                                    value={editForm.word}
                                    onChange={e => setEditForm({ ...editForm, word: e.target.value })}
                                    className="w-full bg-dark-950 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Definição</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={editForm.definition}
                                    onChange={e => setEditForm({ ...editForm, definition: e.target.value })}
                                    className="w-full bg-dark-950 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-500 resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Tags (separadas por vírgula)</label>
                                <input
                                    type="text"
                                    value={editForm.tags}
                                    onChange={e => setEditForm({ ...editForm, tags: e.target.value })}
                                    className="w-full bg-dark-950 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-500"
                                />
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <Button type="button" variant="outline" onClick={() => setEditingTerm(null)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" className="bg-brand-500 text-black hover:bg-brand-400">
                                    Salvar Alterações
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

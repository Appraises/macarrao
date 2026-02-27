import React, { useState } from 'react';
import { Send, Image as ImageIcon } from 'lucide-react';
import { Button } from '../../components/UI';

export const News: React.FC = () => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('Geral');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log({ title, content, category });
        alert('Notícia publicada com sucesso!');
        setTitle('');
        setContent('');
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-2xl font-bold text-white font-display">Publicar Notícia</h2>
                <p className="text-gray-400 text-sm">Mantenha a comunidade informada</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form */}
                <div className="lg:col-span-2">
                    <form onSubmit={handleSubmit} className="bg-dark-900 border border-white/5 p-6 rounded-xl shadow-lg space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Título</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-dark-950 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-brand-500 transition-colors"
                                placeholder="Ex: Nova atualização do Valorant"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Categoria</label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full bg-dark-950 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-brand-500 transition-colors appearance-none"
                                >
                                    <option>Geral</option>
                                    <option>E-Sports</option>
                                    <option>Atualizações</option>
                                    <option>Comunidade</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Imagem de Capa</label>
                                <div className="w-full bg-dark-950 border border-white/10 border-dashed rounded-lg py-2.5 px-4 text-gray-500 flex items-center justify-center gap-2 cursor-pointer hover:border-brand-500/50 hover:text-brand-400 transition-all">
                                    <ImageIcon className="w-4 h-4" />
                                    <span className="text-sm">Upload</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Conteúdo</label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={10}
                                className="w-full bg-dark-950 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-brand-500 transition-colors resize-none"
                                placeholder="Escreva sua notícia aqui..."
                            />
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button type="submit" className="bg-brand-600 hover:bg-brand-500 text-white font-bold px-8">
                                <Send className="w-4 h-4 mr-2" />
                                Publicar
                            </Button>
                        </div>
                    </form>
                </div>

                {/* Preview / Recent */}
                <div className="space-y-6">
                    <div className="bg-dark-900 border border-white/5 p-6 rounded-xl shadow-lg">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Últimas Publicações</h3>
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex gap-3 group cursor-pointer">
                                    <div className="w-16 h-16 bg-dark-800 rounded-lg flex-shrink-0 overflow-hidden">
                                        <div className="w-full h-full bg-gradient-to-br from-brand-500/20 to-purple-500/20 group-hover:scale-110 transition-transform duration-500"></div>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-200 group-hover:text-brand-400 transition-colors line-clamp-2">Título da notícia recente {i}</h4>
                                        <p className="text-xs text-gray-500 mt-1">Há 2 horas</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

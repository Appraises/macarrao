import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Book, Gamepad2, Loader2, UserX } from 'lucide-react';
import { getPublicProfile } from '../src/services/api';
import type { PublicProfile as Profile } from '../types';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { BadgeGrid } from '../components/profile/BadgeGrid';
import { Seo } from '../components/Seo';

export const PublicProfile: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        setNotFound(false);
        getPublicProfile(id)
            .then((data) => { if (data) setProfile(data); else setNotFound(true); })
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return (
        <div className="flex min-h-[60vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
    );

    if (notFound || !profile) return (
        <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
            <UserX className="mb-4 h-12 w-12 text-gray-600" />
            <h1 className="text-xl font-bold text-white">Perfil não encontrado</h1>
            <p className="mt-2 text-sm text-gray-500">Este contribuidor não existe ou removeu seus dados da plataforma.</p>
            <Link to="/dicionario" className="mt-6 text-sm font-bold text-brand-400 hover:text-brand-300">Explorar o dicionário</Link>
        </div>
    );

    const memberSince = profile.createdAt
        ? new Date(profile.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        : null;

    return (
        <div className="min-h-screen bg-dark-950 text-gray-200 font-sans pb-20">
            <Seo
                title={`${profile.name} — contribuidor`}
                description={`Termos que ${profile.name} adicionou ao Dicionário Gamer.`}
                path={`/u/${profile.id}`}
            />

            {/* Same gradient wash as the customization page */}
            <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-brand-900/20 to-dark-950 pointer-events-none z-0"></div>

            <div className="relative z-10 max-w-7xl mx-auto pt-8 px-4 lg:px-8">
                <Link to="/dicionario" className="mb-6 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white">
                    <ArrowLeft className="h-4 w-4" /> Voltar ao dicionário
                </Link>

                {/* Read-only header: no edit button (editable={false}) */}
                <ProfileHeader
                    profile={profile}
                    isEditing={false}
                    editable={false}
                    onEditStart={() => { /* not editable */ }}
                    termsCount={profile.termsCount}
                    commentsCount={profile.commentsCount}
                />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left column */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Favorite game box — same visual, read-only */}
                        <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden shadow-lg">
                            {profile.favoriteGame ? (
                                <Link to={`/games/${profile.favoriteGame.slug}`} className="group block h-48 relative overflow-hidden bg-gradient-to-r from-brand-900/50 to-dark-900">
                                    <div
                                        className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-50 transition-opacity"
                                        style={{ backgroundImage: `url(${profile.favoriteGame.image})` }}
                                    ></div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-transparent to-transparent"></div>
                                    <div className="absolute bottom-0 left-0 p-6">
                                        <h3 className="text-sm font-bold text-brand-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                                            <Gamepad2 className="w-4 h-4" /> Jogo Favorito
                                        </h3>
                                        <h2 className="text-3xl font-black text-white">{profile.favoriteGame.name}</h2>
                                    </div>
                                </Link>
                            ) : (
                                <div className="p-8 text-center">
                                    <Gamepad2 className="w-12 h-12 text-dark-700 mx-auto mb-3" />
                                    <p className="text-gray-500">{profile.name} ainda não escolheu um jogo favorito.</p>
                                </div>
                            )}
                        </div>

                        {/* Terms this person authored — clickable, unlike the owner's activity feed */}
                        <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden min-h-[300px]">
                            <div className="flex border-b border-dark-700">
                                <div className="flex-1 py-4 text-center text-sm font-bold uppercase tracking-wider text-brand-500 border-b-2 border-brand-500 bg-dark-800">
                                    Palavras de {profile.name}
                                </div>
                            </div>
                            <div className="p-6">
                                {profile.terms.length > 0 ? (
                                    <div className="space-y-4">
                                        {profile.terms.map((term) => (
                                            <Link
                                                key={term.id}
                                                to={`/term/${encodeURIComponent(term.word)}`}
                                                state={{ source: 'profile' }}
                                                className="block bg-dark-950/50 border border-dark-700/50 rounded-lg p-4 hover:border-brand-500/30 transition-all group"
                                            >
                                                <div className="flex items-start gap-4">
                                                    <div className="w-10 h-10 rounded bg-brand-500/10 flex items-center justify-center flex-shrink-0 text-brand-500 group-hover:bg-brand-500 group-hover:text-black transition-colors">
                                                        <Book className="w-5 h-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h4 className="text-white font-bold group-hover:text-brand-400 transition-colors">{term.word}</h4>
                                                            {term.game && <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{term.game.name}</span>}
                                                        </div>
                                                        <p className="text-sm text-gray-400 mt-1 line-clamp-2">{term.definition}</p>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <Book className="w-12 h-12 text-dark-700 mx-auto mb-4" />
                                        <p className="text-gray-500">Nenhuma palavra contribuída ainda.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right column — badges + real stats, same card style as the customization page */}
                    <div className="lg:col-span-4 space-y-6">
                        <BadgeGrid earned={profile.badges || []} />

                        <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Estatísticas</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center p-2 rounded">
                                    <span className="text-gray-400 text-sm">Nível</span>
                                    <span className="text-brand-500 font-bold">{profile.level}</span>
                                </div>
                                <div className="flex justify-between items-center p-2 rounded">
                                    <span className="text-gray-400 text-sm">Palavras</span>
                                    <span className="text-brand-500 font-bold">{profile.termsCount}</span>
                                </div>
                                <div className="flex justify-between items-center p-2 rounded">
                                    <span className="text-gray-400 text-sm">Comentários</span>
                                    <span className="text-brand-500 font-bold">{profile.commentsCount}</span>
                                </div>
                                {memberSince && (
                                    <div className="flex justify-between items-center p-2 rounded">
                                        <span className="text-gray-400 text-sm">Membro desde</span>
                                        <span className="text-gray-300 font-medium capitalize">{memberSince}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

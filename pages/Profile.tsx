import React, { useState, useEffect } from 'react';
import { useAuth } from '../src/context/AuthContext';
import { getUserProfile, getUserActivity, updateUserProfile, getGames } from '../src/services/api';
import { User, Term, Comment, Game } from '../types';
import { Button } from '../components/UI';
import { Gamepad2, Trophy, Medal, Star } from 'lucide-react';

// Sub-components
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { ProfileEditForm } from '../components/profile/ProfileEditForm';
import { ActivitySection } from '../components/profile/ActivitySection';

export const Profile: React.FC = () => {
    const { user: authUser, login } = useAuth();
    const [profile, setProfile] = useState<User | null>(null);
    const [activity, setActivity] = useState<{ terms: Term[], comments: Comment[] }>({ terms: [], comments: [] });
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', avatar: '', description: '', favoriteGameId: '' });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [profileData, activityData, gamesData] = await Promise.all([
                    getUserProfile(),
                    getUserActivity(),
                    getGames()
                ]);
                setProfile(profileData);
                setActivity(activityData);
                setGames(gamesData);
                setEditForm({
                    name: profileData.name,
                    avatar: profileData.avatar || '',
                    description: profileData.description || '',
                    favoriteGameId: profileData.favoriteGame?.id || ''
                });
            } catch (error) {
                console.error("Failed to fetch profile", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleUpdateProfile = async () => {
        try {
            const updatedUser = await updateUserProfile(editForm);
            setProfile(updatedUser);
            if (authUser) {
                login({ ...authUser, ...updatedUser });
            }
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to update profile", error);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Carregando...</div>;
    if (!profile) return <div className="min-h-screen flex items-center justify-center text-white">Erro ao carregar perfil</div>;

    return (
        <div className="min-h-screen bg-dark-950 text-gray-200 font-sans pb-20">
            {/* Background Gradient Overlay */}
            <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-brand-900/20 to-dark-950 pointer-events-none z-0"></div>

            <div className="relative z-10 max-w-7xl mx-auto pt-12 px-4 lg:px-8">

                {/* Header Section */}
                <ProfileHeader
                    profile={profile}
                    isEditing={isEditing}
                    onEditStart={() => setIsEditing(true)}
                    termsCount={activity.terms.length}
                    commentsCount={activity.comments.length}
                >
                    <ProfileEditForm
                        editForm={editForm}
                        setEditForm={setEditForm}
                        games={games}
                        onSave={handleUpdateProfile}
                        onCancel={() => setIsEditing(false)}
                    />
                </ProfileHeader>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left Column (Content) */}
                    <div className="lg:col-span-8 space-y-8">

                        {/* Favorite Game Box */}
                        <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden shadow-lg group hover:border-brand-500/30 transition-colors">
                            {profile.favoriteGame ? (
                                <>
                                    <div className="h-48 bg-gradient-to-r from-brand-900/50 to-dark-900 relative overflow-hidden">
                                        <div
                                            className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-50 transition-opacity"
                                            style={{ backgroundImage: `url(${profile.favoriteGame.image})` }}
                                        ></div>
                                        <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-transparent to-transparent"></div>
                                        <div className="absolute bottom-0 left-0 p-6">
                                            <h3 className="text-sm font-bold text-brand-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                                                <Gamepad2 className="w-4 h-4" />
                                                Jogo Favorito
                                            </h3>
                                            <h2 className="text-3xl font-black text-white">{profile.favoriteGame.name}</h2>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="p-8 text-center border-b border-dark-700/50">
                                    <Gamepad2 className="w-12 h-12 text-dark-700 mx-auto mb-4" />
                                    <h3 className="text-xl font-bold text-white mb-2">Qual seu jogo favorito?</h3>
                                    <p className="text-gray-500 mb-4">Edite seu perfil para selecionar o jogo que você mais curte no momento.</p>
                                    <Button onClick={() => setIsEditing(true)} variant="outline">
                                        Selecionar Jogo
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Recent Activity */}
                        <ActivitySection terms={activity.terms} comments={activity.comments} />
                    </div>

                    {/* Right Column (Sidebar) */}
                    <div className="lg:col-span-4 space-y-6">

                        {/* Badges */}
                        <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center justify-between">
                                Insígnias
                                <span className="bg-dark-800 text-white px-2 py-0.5 rounded text-xs">3</span>
                            </h3>
                            <div className="grid grid-cols-4 gap-2">
                                <div className="aspect-square bg-dark-800 rounded-lg flex items-center justify-center border border-dark-700 hover:border-brand-500/50 transition-colors group relative cursor-help">
                                    <Trophy className="w-6 h-6 text-yellow-500" />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-xs text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                                        Pioneiro
                                    </div>
                                </div>
                                <div className="aspect-square bg-dark-800 rounded-lg flex items-center justify-center border border-dark-700 hover:border-brand-500/50 transition-colors group relative cursor-help">
                                    <Medal className="w-6 h-6 text-blue-500" />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-xs text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                                        Contribuidor
                                    </div>
                                </div>
                                <div className="aspect-square bg-dark-800 rounded-lg flex items-center justify-center border border-dark-700 hover:border-brand-500/50 transition-colors group relative cursor-help">
                                    <Star className="w-6 h-6 text-purple-500" />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-xs text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                                        Veterano
                                    </div>
                                </div>
                                <div className="aspect-square bg-dark-800/50 rounded-lg flex items-center justify-center border border-dark-700 border-dashed text-dark-600">
                                    <span className="text-xl">+</span>
                                </div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Estatísticas</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center p-2 hover:bg-dark-800 rounded transition-colors cursor-pointer group">
                                    <span className="text-gray-400 group-hover:text-white transition-colors text-sm">Jogos Favoritos</span>
                                    <span className="text-brand-500 font-bold">27</span>
                                </div>
                                <div className="flex justify-between items-center p-2 hover:bg-dark-800 rounded transition-colors cursor-pointer group">
                                    <span className="text-gray-400 group-hover:text-white transition-colors text-sm">Avaliações</span>
                                    <span className="text-brand-500 font-bold">12</span>
                                </div>
                                <div className="flex justify-between items-center p-2 hover:bg-dark-800 rounded transition-colors cursor-pointer group">
                                    <span className="text-gray-400 group-hover:text-white transition-colors text-sm">Seguidores</span>
                                    <span className="text-brand-500 font-bold">142</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};

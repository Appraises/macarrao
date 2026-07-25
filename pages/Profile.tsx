import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext';
import { getUserProfile, getUserActivity, updateUserProfile, getGames } from '../src/services/api';
import { User, Term, Comment, Game } from '../types';
import { Button } from '../components/UI';
import { ClipboardList, Gamepad2 } from 'lucide-react';

// Sub-components
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { ProfileEditForm } from '../components/profile/ProfileEditForm';
import { ActivitySection } from '../components/profile/ActivitySection';
import { BadgeGrid } from '../components/profile/BadgeGrid';

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

                        <Link to="/minhas-contribuicoes" className="flex items-center justify-between rounded-lg border border-brand-500/20 bg-brand-500/10 p-4 text-brand-300 transition-colors hover:border-brand-500/40 hover:bg-brand-500/15">
                            <span className="flex items-center gap-3 font-bold"><ClipboardList className="h-5 w-5" /> Minhas contribuições</span>
                            <span className="text-xs text-brand-400">Acompanhar</span>
                        </Link>

                        {/* Badges — real, earned from milestones */}
                        <BadgeGrid earned={profile.badges || []} emptyHint="Contribua com termos e comentários para desbloquear suas primeiras insígnias." />

                        {/* Stats */}
                        <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Estatísticas</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center p-2 rounded">
                                    <span className="text-gray-400 text-sm">Palavras</span>
                                    <span className="text-brand-500 font-bold">{activity.terms.length}</span>
                                </div>
                                <div className="flex justify-between items-center p-2 rounded">
                                    <span className="text-gray-400 text-sm">Comentários</span>
                                    <span className="text-brand-500 font-bold">{activity.comments.length}</span>
                                </div>
                                <div className="flex justify-between items-center p-2 rounded">
                                    <span className="text-gray-400 text-sm">Insígnias</span>
                                    <span className="text-brand-500 font-bold">{(profile.badges || []).length}</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};

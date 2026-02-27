import React from 'react';
import { Edit2, MapPin } from 'lucide-react';
import { User } from '../../types';

interface ProfileHeaderProps {
    profile: User;
    isEditing: boolean;
    onEditStart: () => void;
    termsCount: number;
    commentsCount: number;
    children?: React.ReactNode; // For the edit form when editing
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ profile, isEditing, onEditStart, termsCount, commentsCount, children }) => {
    return (
        <div className="flex flex-col md:flex-row gap-8 mb-12 items-start">
            {/* Avatar */}
            <div className="relative group flex-shrink-0 mx-auto md:mx-0">
                <div className="w-40 h-40 rounded-2xl overflow-hidden border-4 border-dark-800 shadow-2xl relative bg-dark-900">
                    {profile.avatar ? (
                        <img
                            src={profile.avatar}
                            alt={profile.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-brand-500 flex items-center justify-center text-5xl font-bold text-white">
                            {profile.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                {!isEditing && (
                    <button
                        onClick={onEditStart}
                        className="absolute bottom-2 right-2 bg-dark-900/80 p-2 rounded-lg border border-white/10 text-white hover:bg-brand-500 hover:border-brand-500 transition-all shadow-lg backdrop-blur-sm"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* User Info */}
            <div className="flex-1 flex flex-col justify-between min-h-[160px] py-2">
                <div>
                    {isEditing ? (
                        children
                    ) : (
                        <>
                            <div className="flex items-center gap-4 mb-2">
                                <h1 className="text-4xl font-black text-white tracking-tight">{profile.name}</h1>
                                <span className="px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-bold uppercase tracking-wider">
                                    Nível {profile.level}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                                <MapPin className="w-4 h-4" />
                                <span>Brasil</span>
                                <span className="mx-2">•</span>
                                <span className="text-brand-500 font-medium">Online</span>
                            </div>
                            <p className="text-gray-400 max-w-lg leading-relaxed">
                                {profile.description || "Nenhuma descrição informada."}
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* Stats / Level Badge */}
            <div className="hidden md:flex gap-4">
                <div className="bg-dark-900 border border-dark-700 rounded-xl p-4 flex flex-col items-center justify-center min-w-[100px]">
                    <span className="text-3xl font-black text-white">{termsCount}</span>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">Palavras</span>
                </div>
                <div className="bg-dark-900 border border-dark-700 rounded-xl p-4 flex flex-col items-center justify-center min-w-[100px]">
                    <span className="text-3xl font-black text-white">{commentsCount}</span>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">Comentários</span>
                </div>
            </div>
        </div>
    );
};

import React from 'react';
import { Input, Button } from '../UI';
import { Game } from '../../types';

interface ProfileEditFormProps {
    editForm: { name: string; avatar: string; description: string; favoriteGameId: string };
    setEditForm: (form: any) => void;
    games: Game[];
    onSave: () => void;
    onCancel: () => void;
}

export const ProfileEditForm: React.FC<ProfileEditFormProps> = ({ editForm, setEditForm, games, onSave, onCancel }) => {
    return (
        <div className="space-y-4 bg-dark-900 p-6 rounded-xl border border-dark-700 shadow-xl max-w-xl animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-lg font-bold text-white mb-2">Editar Perfil</h3>
            <div className="grid grid-cols-1 gap-4">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nome de Exibição</label>
                    <Input
                        value={editForm.name}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">URL do Avatar</label>
                    <Input
                        value={editForm.avatar}
                        onChange={e => setEditForm({ ...editForm, avatar: e.target.value })}
                        className="w-full"
                        placeholder="https://..."
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Sobre Mim</label>
                    <textarea
                        value={editForm.description}
                        onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                        className="w-full bg-dark-950 border border-dark-700 rounded-lg px-4 py-3 text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all min-h-[100px] resize-none"
                        placeholder="Conte um pouco sobre você..."
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Jogo Favorito</label>
                    <select
                        value={editForm.favoriteGameId}
                        onChange={e => setEditForm({ ...editForm, favoriteGameId: e.target.value })}
                        className="w-full bg-dark-950 border border-dark-700 rounded-lg px-4 py-3 text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
                    >
                        <option value="">Selecione um jogo...</option>
                        {games.map(game => (
                            <option key={game.id} value={game.id}>{game.name}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="flex gap-3 pt-2">
                <Button onClick={onSave} className="flex-1">
                    Salvar Alterações
                </Button>
                <Button variant="ghost" onClick={onCancel} className="flex-1">
                    Cancelar
                </Button>
            </div>
        </div>
    );
};

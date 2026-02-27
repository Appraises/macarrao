import React, { useState, useEffect } from 'react';
import { useAuth } from '../src/context/AuthContext';
import { updateUserProfile, updatePassword } from '../src/services/api';
import { Button, Input } from '../components/UI';
import { Bell, Lock, Eye, EyeOff, Save, Shield, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Settings: React.FC = () => {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Preferences State
    const [preferences, setPreferences] = useState({
        emailNotifications: true,
        browserPush: false,
        publicProfile: true,
        showOnlineStatus: true
    });

    // Password State
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    useEffect(() => {
        if (user?.preferences) {
            try {
                const parsed = typeof user.preferences === 'string'
                    ? JSON.parse(user.preferences)
                    : user.preferences;
                setPreferences(prev => ({ ...prev, ...parsed }));
            } catch (e) {
                console.error("Failed to parse preferences", e);
            }
        }
    }, [user]);

    const handleSavePreferences = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const updatedUser = await updateUserProfile({
                preferences: JSON.stringify(preferences)
            });
            login({ ...user!, ...updatedUser });
            setMessage({ type: 'success', text: 'Preferências salvas com sucesso!' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Erro ao salvar preferências.' });
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setMessage({ type: 'error', text: 'As novas senhas não coincidem.' });
            return;
        }

        if (passwordForm.newPassword.length < 6) {
            setMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres.' });
            return;
        }

        setLoading(true);
        try {
            await updatePassword(passwordForm.currentPassword, passwordForm.newPassword);
            setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Erro ao alterar senha.' });
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        navigate('/login');
        return null;
    }

    return (
        <div className="min-h-screen bg-dark-950 text-gray-200 font-sans pb-20 pt-28 px-4">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-black text-white mb-8 flex items-center gap-3">
                    <User className="w-8 h-8 text-brand-500" />
                    Configurações da Conta
                </h1>

                {message && (
                    <div className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        {message.text}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* PREFERENCES COLUMN */}
                    <div className="space-y-6">
                        <div className="bg-dark-900 border border-dark-700 rounded-xl p-6 shadow-lg">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Bell className="w-5 h-5 text-brand-400" />
                                Notificações
                            </h2>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-dark-950/50 rounded-lg border border-dark-800">
                                    <div>
                                        <p className="font-bold text-gray-200">Alertas por Email</p>
                                        <p className="text-xs text-gray-500">Receba novidades e atualizações.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={preferences.emailNotifications}
                                            onChange={e => setPreferences({ ...preferences, emailNotifications: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-dark-950/50 rounded-lg border border-dark-800">
                                    <div>
                                        <p className="font-bold text-gray-200">Push no Navegador</p>
                                        <p className="text-xs text-gray-500">Notificações instantâneas.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={preferences.browserPush}
                                            onChange={e => setPreferences({ ...preferences, browserPush: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="bg-dark-900 border border-dark-700 rounded-xl p-6 shadow-lg">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-brand-400" />
                                Privacidade
                            </h2>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-dark-950/50 rounded-lg border border-dark-800">
                                    <div>
                                        <p className="font-bold text-gray-200">Perfil Público</p>
                                        <p className="text-xs text-gray-500">Outros usuários podem ver seu perfil.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={preferences.publicProfile}
                                            onChange={e => setPreferences({ ...preferences, publicProfile: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-dark-950/50 rounded-lg border border-dark-800">
                                    <div>
                                        <p className="font-bold text-gray-200">Mostrar Status Online</p>
                                        <p className="text-xs text-gray-500">Exibir quando você estiver ativo.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={preferences.showOnlineStatus}
                                            onChange={e => setPreferences({ ...preferences, showOnlineStatus: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <Button onClick={handleSavePreferences} disabled={loading} className="w-full">
                            <Save className="w-4 h-4 mr-2" />
                            Salvar Preferências
                        </Button>
                    </div>

                    {/* PASSWORD COLUMN */}
                    <div className="bg-dark-900 border border-dark-700 rounded-xl p-6 shadow-lg h-fit">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Lock className="w-5 h-5 text-red-400" />
                            Segurança
                        </h2>

                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Senha Atual</label>
                                <div className="relative">
                                    <Input
                                        type={showCurrentPassword ? "text" : "password"}
                                        value={passwordForm.currentPassword}
                                        onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                        className="w-full pr-10"
                                        required
                                    />
                                    <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="h-px bg-dark-800 my-4"></div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nova Senha</label>
                                <div className="relative">
                                    <Input
                                        type={showNewPassword ? "text" : "password"}
                                        value={passwordForm.newPassword}
                                        onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                        className="w-full pr-10"
                                        required
                                        minLength={6}
                                    />
                                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Confirmar Nova Senha</label>
                                <Input
                                    type="password"
                                    value={passwordForm.confirmPassword}
                                    onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                    className="w-full"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <Button type="submit" variant="outline" disabled={loading} className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300">
                                Alterar Senha
                            </Button>
                        </form>
                    </div>

                </div>
            </div>
        </div>
    );
};

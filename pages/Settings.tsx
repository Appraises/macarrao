import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Bell,
    CheckCircle2,
    Download,
    Eye,
    EyeOff,
    FileClock,
    Lock,
    RefreshCw,
    Save,
    Shield,
    Trash2,
    User,
    XCircle
} from 'lucide-react';
import { Button, Input } from '../components/UI';
import { useAuth } from '../src/context/AuthContext';
import {
    cancelPrivacyRequest,
    confirmPrivacyRequest,
    createPrivacyRequest,
    exportMyData,
    getMyPrivacyRequests,
    resendPrivacyConfirmation,
    updatePassword,
    updateUserProfile
} from '../src/services/api';
import type { PrivacyRequest, PrivacyRequestStatus, PrivacyRequestType } from '../types';

const statusLabels: Record<PrivacyRequestStatus, string> = {
    REQUESTED: 'Aguardando confirmação',
    CONFIRMED: 'Confirmada',
    IN_REVIEW: 'Em análise',
    PROCESSING: 'Em processamento',
    COMPLETED: 'Concluída',
    REJECTED: 'Recusada',
    CANCELED: 'Cancelada'
};

const typeLabels: Record<PrivacyRequestType, string> = {
    EXPORT: 'Exportação de dados',
    DELETE: 'Exclusão da conta',
    CORRECTION: 'Correção de dados',
    ANONYMIZATION: 'Anonimização'
};

const statusClasses: Record<PrivacyRequestStatus, string> = {
    REQUESTED: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    CONFIRMED: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    IN_REVIEW: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
    PROCESSING: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
    COMPLETED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    REJECTED: 'border-red-500/30 bg-red-500/10 text-red-300',
    CANCELED: 'border-white/10 bg-white/5 text-gray-400'
};

type Notice = { type: 'success' | 'error'; text: string } | null;
type ManagedRequestType = Exclude<PrivacyRequestType, 'EXPORT'>;

export const Settings: React.FC = () => {
    const { user, login, logout } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const privacyToken = searchParams.get('privacyToken');
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState<Notice>(null);
    const [confirmationState, setConfirmationState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [privacyRequests, setPrivacyRequests] = useState<PrivacyRequest[]>([]);
    const [privacyLoading, setPrivacyLoading] = useState(false);
    const [requestForm, setRequestForm] = useState<{ type: ManagedRequestType; password: string; requestNote: string }>({
        type: 'DELETE',
        password: '',
        requestNote: ''
    });
    const [preferences, setPreferences] = useState({
        emailNotifications: true,
        publicProfile: true,
        showOnlineStatus: true
    });
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    const loadPrivacyRequests = useCallback(async () => {
        if (!user) return;
        setPrivacyLoading(true);
        try {
            setPrivacyRequests(await getMyPrivacyRequests());
        } catch {
            setNotice({ type: 'error', text: 'Não foi possível carregar suas solicitações de privacidade.' });
        } finally {
            setPrivacyLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!privacyToken) return;
        setConfirmationState('loading');
        confirmPrivacyRequest(privacyToken)
            .then(() => {
                setConfirmationState('success');
                setNotice({ type: 'success', text: 'Solicitação confirmada. A equipe já pode iniciar a análise.' });
                setSearchParams({}, { replace: true });
                void loadPrivacyRequests();
            })
            .catch((error) => {
                setConfirmationState('error');
                setNotice({ type: 'error', text: error.response?.data?.error || 'O link de confirmação é inválido ou expirou.' });
            });
    }, [privacyToken, setSearchParams, loadPrivacyRequests]);

    useEffect(() => {
        if (!user && !privacyToken && confirmationState !== 'success') navigate('/login', { replace: true });
    }, [user, privacyToken, confirmationState, navigate]);

    useEffect(() => {
        if (!user) return;
        if (user.preferences) {
            try {
                const parsed = typeof user.preferences === 'string' ? JSON.parse(user.preferences) : user.preferences;
                setPreferences((previous) => ({ ...previous, ...parsed }));
            } catch {
                // Keep defaults when legacy preference data is malformed.
            }
        }
        void loadPrivacyRequests();
    }, [user, loadPrivacyRequests]);

    const handleSavePreferences = async () => {
        setLoading(true);
        setNotice(null);
        try {
            const updatedUser = await updateUserProfile({ preferences });
            login({ ...user!, ...updatedUser });
            setNotice({ type: 'success', text: 'Preferências salvas com sucesso.' });
        } catch {
            setNotice({ type: 'error', text: 'Erro ao salvar preferências.' });
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (event: React.FormEvent) => {
        event.preventDefault();
        setNotice(null);
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            return setNotice({ type: 'error', text: 'As novas senhas não coincidem.' });
        }
        if (passwordForm.newPassword.length < 6) {
            return setNotice({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres.' });
        }
        setLoading(true);
        try {
            await updatePassword(passwordForm.currentPassword, passwordForm.newPassword);
            logout();
            navigate('/login', { replace: true });
        } catch (error: any) {
            setNotice({ type: 'error', text: error.response?.data?.error || 'Erro ao alterar senha.' });
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        setPrivacyLoading(true);
        setNotice(null);
        try {
            const { blob, filename } = await exportMyData();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            setNotice({ type: 'success', text: 'Seu arquivo de dados foi gerado.' });
            await loadPrivacyRequests();
        } catch {
            setNotice({ type: 'error', text: 'Não foi possível gerar a exportação.' });
        } finally {
            setPrivacyLoading(false);
        }
    };

    const handleCreateRequest = async (event: React.FormEvent) => {
        event.preventDefault();
        setPrivacyLoading(true);
        setNotice(null);
        try {
            const result = await createPrivacyRequest(requestForm);
            setRequestForm((previous) => ({ ...previous, password: '', requestNote: '' }));
            setNotice({
                type: result.emailSent ? 'success' : 'error',
                text: result.emailSent
                    ? `Pedido ${result.request.protocol} aberto. Confirme-o pelo link enviado ao seu email.`
                    : `Pedido ${result.request.protocol} aberto, mas o email de confirmação não pôde ser enviado. Use o botão de reenvio mais tarde.`
            });
            await loadPrivacyRequests();
        } catch (error: any) {
            setNotice({ type: 'error', text: error.response?.data?.error || 'Não foi possível abrir a solicitação.' });
        } finally {
            setPrivacyLoading(false);
        }
    };

    const handleResend = async (request: PrivacyRequest) => {
        setPrivacyLoading(true);
        try {
            const result = await resendPrivacyConfirmation(request.id);
            setNotice({
                type: result.emailSent ? 'success' : 'error',
                text: result.emailSent ? 'Um novo link de confirmação foi enviado.' : 'Não foi possível enviar o email agora.'
            });
        } catch (error: any) {
            setNotice({ type: 'error', text: error.response?.data?.error || 'Falha ao reenviar a confirmação.' });
        } finally {
            setPrivacyLoading(false);
        }
    };

    const handleCancel = async (request: PrivacyRequest) => {
        if (!window.confirm(`Cancelar a solicitação ${request.protocol}?`)) return;
        setPrivacyLoading(true);
        try {
            await cancelPrivacyRequest(request.id);
            setNotice({ type: 'success', text: 'Solicitação cancelada.' });
            await loadPrivacyRequests();
        } catch (error: any) {
            setNotice({ type: 'error', text: error.response?.data?.error || 'A solicitação não pode ser cancelada.' });
        } finally {
            setPrivacyLoading(false);
        }
    };

    if (!user) {
        if (privacyToken || confirmationState !== 'idle') {
            return (
                <div className="min-h-[70vh] bg-dark-950 px-4 pt-32 text-gray-200">
                    <div className="mx-auto max-w-lg border border-white/10 bg-dark-900 p-8 text-center">
                        {confirmationState === 'loading' ? <RefreshCw className="mx-auto h-10 w-10 animate-spin text-brand-400" /> : confirmationState === 'success' ? <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" /> : <XCircle className="mx-auto h-10 w-10 text-red-400" />}
                        <h1 className="mt-5 text-2xl font-bold text-white">Confirmação de privacidade</h1>
                        <p className="mt-3 text-sm text-gray-400">{notice?.text || 'Validando seu link de confirmação...'}</p>
                        {confirmationState !== 'loading' && <Button onClick={() => navigate('/login')} className="mt-6 w-full">Entrar na conta</Button>}
                    </div>
                </div>
            );
        }
        return null;
    }

    return (
        <div className="min-h-screen bg-dark-950 px-4 pb-20 pt-28 font-sans text-gray-200">
            <div className="mx-auto max-w-5xl space-y-8">
                <h1 className="flex items-center gap-3 text-3xl font-black text-white">
                    <User className="h-8 w-8 text-brand-500" />
                    Configurações da conta
                </h1>

                {notice && <div role="status" className={`border p-4 ${notice.type === 'success' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-red-500/20 bg-red-500/10 text-red-300'}`}>{notice.text}</div>}

                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    <section className="border border-dark-700 bg-dark-900 p-6 shadow-lg">
                        <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-white"><Bell className="h-5 w-5 text-brand-400" /> Preferências</h2>
                        <div className="space-y-4">
                            {[
                                ['emailNotifications', 'Alertas por email', 'Receba novidades e atualizações.'],
                                ['publicProfile', 'Perfil público', 'Permita que outras pessoas vejam seu perfil.'],
                                ['showOnlineStatus', 'Mostrar status online', 'Exiba quando você estiver ativo.']
                            ].map(([key, label, description]) => (
                                <label key={key} className="flex cursor-pointer items-center justify-between gap-4 border-b border-white/5 py-3 last:border-0">
                                    <span><span className="block font-semibold text-gray-200">{label}</span><span className="text-xs text-gray-500">{description}</span></span>
                                    <input type="checkbox" checked={preferences[key as keyof typeof preferences]} onChange={(event) => setPreferences({ ...preferences, [key]: event.target.checked })} className="h-5 w-5 accent-sky-500" />
                                </label>
                            ))}
                        </div>
                        <Button onClick={handleSavePreferences} disabled={loading} className="mt-6 w-full"><Save className="h-4 w-4" /> Salvar preferências</Button>
                    </section>

                    <section className="h-fit border border-dark-700 bg-dark-900 p-6 shadow-lg">
                        <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-white"><Lock className="h-5 w-5 text-red-400" /> Segurança</h2>
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <label className="block"><span className="mb-1 block text-xs font-bold uppercase text-gray-500">Senha atual</span><span className="relative block"><Input type={showCurrentPassword ? 'text' : 'password'} value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} className="w-full pr-10" required /><button type="button" title="Mostrar senha atual" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">{showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>
                            <label className="block"><span className="mb-1 block text-xs font-bold uppercase text-gray-500">Nova senha</span><span className="relative block"><Input type={showNewPassword ? 'text' : 'password'} value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} className="w-full pr-10" required minLength={6} /><button type="button" title="Mostrar nova senha" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">{showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>
                            <label className="block"><span className="mb-1 block text-xs font-bold uppercase text-gray-500">Confirmar nova senha</span><Input type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} className="w-full" required minLength={6} /></label>
                            <Button type="submit" variant="outline" disabled={loading} className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10">Alterar senha e encerrar sessões</Button>
                        </form>
                    </section>
                </div>

                <section className="border border-dark-700 bg-dark-900 shadow-lg">
                    <div className="flex flex-col gap-4 border-b border-white/5 p-6 sm:flex-row sm:items-center sm:justify-between">
                        <div><h2 className="flex items-center gap-2 text-xl font-bold text-white"><Shield className="h-5 w-5 text-brand-400" /> Privacidade e seus dados</h2><p className="mt-1 text-sm text-gray-500">Exporte seus dados ou exerça seus direitos com protocolo e acompanhamento.</p></div>
                        <Button onClick={handleExport} disabled={privacyLoading} variant="outline"><Download className="h-4 w-4" /> Baixar meus dados</Button>
                    </div>

                    <div className="grid gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)]">
                        <div>
                            <h3 className="mb-4 flex items-center gap-2 font-bold text-white"><FileClock className="h-4 w-4 text-gray-400" /> Solicitações</h3>
                            {privacyLoading && privacyRequests.length === 0 ? <p className="py-8 text-center text-gray-500">Carregando solicitações...</p> : privacyRequests.length === 0 ? <p className="border border-dashed border-white/10 p-6 text-sm text-gray-500">Você ainda não abriu solicitações.</p> : (
                                <div className="divide-y divide-white/5 border-y border-white/5">
                                    {privacyRequests.map((request) => {
                                        const canCancel = ['REQUESTED', 'CONFIRMED', 'IN_REVIEW'].includes(request.status);
                                        return <div key={request.id} className="py-4">
                                            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-white">{typeLabels[request.type]}</p><p className="mt-1 font-mono text-xs text-gray-500">{request.protocol}</p></div><span className={`border px-2 py-1 text-xs font-semibold ${statusClasses[request.status]}`}>{statusLabels[request.status]}</span></div>
                                            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500"><span>Aberta em {new Date(request.createdAt).toLocaleDateString('pt-BR')} · prazo {new Date(request.dueAt).toLocaleDateString('pt-BR')}</span><span className="flex gap-2">{request.status === 'REQUESTED' && <button type="button" onClick={() => void handleResend(request)} className="text-brand-400 hover:text-brand-300">Reenviar confirmação</button>}{canCancel && <button type="button" onClick={() => void handleCancel(request)} className="text-red-400 hover:text-red-300">Cancelar</button>}</span></div>
                                            {request.resolutionNote && <p className="mt-3 border-l-2 border-white/10 pl-3 text-sm text-gray-400">{request.resolutionNote}</p>}
                                        </div>;
                                    })}
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleCreateRequest} className="space-y-4 border-l-0 border-white/5 lg:border-l lg:pl-8">
                            <div><h3 className="font-bold text-white">Nova solicitação</h3><p className="mt-1 text-xs leading-5 text-gray-500">Pedidos sensíveis exigem sua senha e confirmação pelo email da conta. O prazo começa após a confirmação.</p></div>
                            <label className="block"><span className="mb-1 block text-xs font-bold uppercase text-gray-500">Direito solicitado</span><select value={requestForm.type} onChange={(event) => setRequestForm({ ...requestForm, type: event.target.value as ManagedRequestType })} className="w-full border border-dark-700 bg-dark-950 px-4 py-3 text-gray-100 focus:border-brand-500 focus:outline-none"><option value="DELETE">Excluir minha conta</option><option value="ANONYMIZATION">Anonimizar meus dados</option><option value="CORRECTION">Corrigir meus dados</option></select></label>
                            <label className="block"><span className="mb-1 block text-xs font-bold uppercase text-gray-500">Detalhes {requestForm.type === 'CORRECTION' ? '(obrigatório)' : '(opcional)'}</span><textarea value={requestForm.requestNote} onChange={(event) => setRequestForm({ ...requestForm, requestNote: event.target.value })} required={requestForm.type === 'CORRECTION'} minLength={requestForm.type === 'CORRECTION' ? 10 : undefined} maxLength={2000} rows={4} className="w-full resize-y border border-dark-700 bg-dark-950 px-4 py-3 text-gray-100 focus:border-brand-500 focus:outline-none" placeholder={requestForm.type === 'CORRECTION' ? 'Informe o dado incorreto e como ele deve ficar.' : 'Contexto adicional para a equipe.'} /></label>
                            <label className="block"><span className="mb-1 block text-xs font-bold uppercase text-gray-500">Confirme sua senha</span><Input type="password" value={requestForm.password} onChange={(event) => setRequestForm({ ...requestForm, password: event.target.value })} className="w-full" required /></label>
                            {(requestForm.type === 'DELETE' || requestForm.type === 'ANONYMIZATION') && <p className="border border-red-500/20 bg-red-500/5 p-3 text-xs leading-5 text-red-300">Ao concluir, o acesso será encerrado, credenciais e dados do perfil serão removidos e suas contribuições públicas poderão permanecer atribuídas a “Usuário removido”.</p>}
                            <Button type="submit" disabled={privacyLoading} variant={requestForm.type === 'DELETE' ? 'outline' : 'primary'} className={requestForm.type === 'DELETE' ? 'w-full border-red-500/30 text-red-400 hover:bg-red-500/10' : 'w-full'}>{requestForm.type === 'DELETE' ? <Trash2 className="h-4 w-4" /> : <Shield className="h-4 w-4" />} Abrir solicitação</Button>
                        </form>
                    </div>
                </section>
            </div>
        </div>
    );
};

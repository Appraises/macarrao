import React, { useEffect, useState } from 'react';
import { getUsers, registerUser } from '../../src/services/api';
import { User, PaginationMeta } from '../../types';
import { Shield, User as UserIcon, Search, Plus, X } from 'lucide-react';
import { Badge, Button } from '../../components/UI';
import { PaginationControls } from '../../components/PaginationControls';
import { usePaginatedListQuery } from '../../src/hooks/usePaginatedListQuery';

const EMPTY_PAGINATION: PaginationMeta = {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false
};

export const UsersList: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const { page, pageSize, search, setPage, setPageSize, setSearch } = usePaginatedListQuery(20);
    const [pagination, setPagination] = useState<PaginationMeta>(EMPTY_PAGINATION);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '' });
    const [registerError, setRegisterError] = useState('');

    const fetchUsers = () => {
        setLoading(true);
        getUsers({ page, pageSize, search })
            .then((result) => {
                setUsers(result.items);
                setPagination(result.pagination);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        const timeout = window.setTimeout(fetchUsers, 250);
        return () => window.clearTimeout(timeout);
    }, [page, pageSize, search]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setRegisterError('');
        try {
            await registerUser(newUser);
            setIsModalOpen(false);
            setNewUser({ name: '', email: '', password: '' });
            fetchUsers();
        } catch (error) {
            setRegisterError('Falha ao registrar usuário. Verifique os dados.');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white font-display">Usuários Cadastrados</h2>
                    <p className="text-gray-400 text-sm">Gerencie a comunidade do Dicionário Gamer</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Buscar usuário..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-dark-900 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-brand-500 w-full md:w-64"
                        />
                    </div>
                    <Button onClick={() => setIsModalOpen(true)} className="bg-brand-500 text-black hover:bg-brand-400">
                        <Plus className="w-4 h-4 mr-2" />
                        Novo Usuário
                    </Button>
                </div>
            </div>

            <div className="bg-dark-900 border border-white/5 rounded-xl overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5 text-xs uppercase tracking-wider text-gray-400 font-bold">
                                <th className="p-4">Usuário</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Nível</th>
                                <th className="p-4">Função</th>
                                <th className="p-4">Data de Cadastro</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">Carregando usuários...</td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">Nenhum usuário encontrado.</td>
                                </tr>
                            ) : (
                                users.map(user => (
                                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                {user.avatar ? (
                                                    <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-dark-700" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-dark-800 flex items-center justify-center border border-dark-700">
                                                        <UserIcon className="w-5 h-5 text-gray-500" />
                                                    </div>
                                                )}
                                                <span className="font-bold text-white">{user.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-400 text-sm">{user.email}</td>
                                        <td className="p-4">
                                            <span className="font-mono text-brand-400 font-bold">Lvl {user.level}</span>
                                        </td>
                                        <td className="p-4">
                                            {user.role === 'ADMIN' ? (
                                                <Badge color="red" className="flex items-center gap-1 w-fit">
                                                    <Shield className="w-3 h-3" /> Admin
                                                </Badge>
                                            ) : (
                                                <Badge color="gray">Membro</Badge>
                                            )}
                                        </td>
                                        <td className="p-4 text-gray-500 text-sm">
                                            {new Date(user.createdAt || Date.now()).toLocaleDateString('pt-BR')}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <PaginationControls
                    pagination={pagination}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                    disabled={loading}
                />
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-dark-900 border border-white/10 rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-white/5">
                            <h3 className="text-xl font-bold text-white">Registrar Novo Usuário</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleRegister} className="p-6 space-y-4">
                            {registerError && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg">
                                    {registerError}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Nome</label>
                                <input
                                    type="text"
                                    required
                                    value={newUser.name}
                                    onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                    className="w-full bg-dark-950 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={newUser.email}
                                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                    className="w-full bg-dark-950 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Senha</label>
                                <input
                                    type="password"
                                    required
                                    value={newUser.password}
                                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                    className="w-full bg-dark-950 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-500"
                                />
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" className="bg-brand-500 text-black hover:bg-brand-400">
                                    Registrar
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

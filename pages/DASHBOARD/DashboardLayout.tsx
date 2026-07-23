import React, { useEffect, Suspense, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Newspaper, LogOut, Users, Flag, Menu, X, Gamepad2, Map, Trophy, RadioTower, ShieldCheck, ClipboardList, BarChart3 } from 'lucide-react';
import { Seo } from '../../components/Seo';

export const DashboardLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token') || localStorage.getItem('dashboard_auth');
        const rawUser = localStorage.getItem('user') || localStorage.getItem('dashboard_user');
        let isAdmin = false;
        try {
            isAdmin = JSON.parse(rawUser || 'null')?.role === 'ADMIN';
        } catch {
            isAdmin = false;
        }
        if (!token || !isAdmin) {
            navigate('/dashboard/login');
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('dashboard_auth');
        localStorage.removeItem('dashboard_user');
        navigate('/dashboard/login');
    };

    const navItems = [
        { label: 'Analytics', path: '/dashboard/analytics', icon: BarChart3 },
        { label: 'Visão Geral', path: '/dashboard/overview', icon: LayoutDashboard },
        { label: 'Contribuições', path: '/dashboard/contributions', icon: ClipboardList },
        { label: 'Catálogo', path: '/dashboard/terms', icon: FileText },
        { label: 'Usuários', path: '/dashboard/users', icon: Users },
        { label: 'Solicitações LGPD', path: '/dashboard/privacy-requests', icon: ShieldCheck },
        { label: 'Denúncias', path: '/dashboard/reports', icon: Flag },
        { label: 'Notícias', path: '/dashboard/news', icon: Newspaper },
        { label: 'Jogos', path: '/dashboard/games', icon: Gamepad2 },
        { label: 'Mapas', path: '/dashboard/maps', icon: Map },
        { label: 'Campeonatos', path: '/dashboard/tournaments', icon: Trophy },
        { label: 'E-sports', path: '/dashboard/esports', icon: RadioTower },
    ];

    return (
        <div className="min-h-screen bg-dark-950 text-white font-sans selection:bg-brand-500/30">
            <Seo title="Painel Administrativo" noindex nofollow />
            <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-white/5 bg-dark-900 px-4 lg:hidden">
                <span className="font-display text-base font-bold uppercase text-white">
                    Dicionário <span className="text-brand-500">Gamer</span>
                </span>
                <button
                    type="button"
                    onClick={() => setMobileMenuOpen(true)}
                    aria-label="Abrir menu administrativo"
                    className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 hover:text-white"
                >
                    <Menu className="h-5 w-5" />
                </button>
            </header>

            {mobileMenuOpen && (
                <button
                    type="button"
                    aria-label="Fechar menu administrativo"
                    onClick={() => setMobileMenuOpen(false)}
                    className="fixed inset-0 z-40 bg-black/70 lg:hidden"
                />
            )}

            <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/5 bg-dark-900 transition-transform duration-200 lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 border-b border-white/5">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <span className="text-xl font-bold font-display text-white tracking-wide uppercase">
                                Dicionário <span className="text-brand-500">Gamer</span>
                            </span>
                            <p className="text-xs text-gray-500 mt-1">Painel Administrativo</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(false)}
                            aria-label="Fechar menu"
                            className="grid h-9 w-9 flex-none place-items-center rounded-lg text-gray-400 hover:bg-white/5 hover:text-white lg:hidden"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${isActive
                                    ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-brand-400' : 'text-gray-500 group-hover:text-white'}`} />
                                <span className="font-medium text-sm">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/5">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium text-sm">Sair</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="min-w-0 px-4 pb-8 pt-20 sm:px-6 lg:ml-64 lg:p-8">
                <Suspense fallback={<div className="flex items-center justify-center py-32"><div className="w-12 h-12 border-4 border-ocean-500/30 border-t-ocean-500 rounded-full animate-spin"></div></div>}>
                    <Outlet />
                </Suspense>
            </main>
        </div>
    );
};

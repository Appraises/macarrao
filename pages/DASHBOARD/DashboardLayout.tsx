import React, { useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Newspaper, LogOut, Users } from 'lucide-react';

export const DashboardLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const isAuth = localStorage.getItem('dashboard_auth');
        if (!isAuth) {
            navigate('/dashboard/login');
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('dashboard_auth');
        navigate('/dashboard/login');
    };

    const navItems = [
        { label: 'Visão Geral', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Palavras', path: '/dashboard/terms', icon: FileText },
        { label: 'Usuários', path: '/dashboard/users', icon: Users },
        { label: 'Notícias', path: '/dashboard/news', icon: Newspaper },
    ];

    return (
        <div className="flex h-screen bg-dark-950 text-white font-sans selection:bg-brand-500/30">
            <aside className="w-64 bg-dark-900 border-r border-white/5 flex flex-col fixed h-full z-50">
                <div className="p-6 border-b border-white/5">
                    <span className="text-xl font-bold font-display text-white tracking-wide uppercase">
                        Dicionário <span className="text-brand-500">Gamer</span>
                    </span>
                    <p className="text-xs text-gray-500 mt-1">Painel Administrativo</p>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
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
            <main className="flex-1 ml-64 p-8 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
};

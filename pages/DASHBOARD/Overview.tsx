import React, { useEffect, useState } from 'react';
import { Users, Book, Gamepad2, Activity } from 'lucide-react';
import { getDashboardStats, getDashboardCharts } from '../../src/services/api';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
});

socket.on("connect_error", (err) => {
    console.error("Socket connection error:", err);
});

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ElementType; color: string }> = ({ title, value, icon: Icon, color }) => (
    <div className="bg-dark-900 border border-white/5 p-6 rounded-xl shadow-lg relative overflow-hidden group hover:border-brand-500/30 transition-all duration-300">
        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
            <Icon className="w-16 h-16" />
        </div>
        <div className="relative z-10">
            <div className={`w-12 h-12 rounded-lg ${color} bg-opacity-10 flex items-center justify-center mb-4 border border-white/5`}>
                <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
            </div>
            <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">{title}</h3>
            <p className="text-3xl font-bold text-white mt-1">{value}</p>
        </div>
    </div>
);

export const Overview: React.FC = () => {
    const [stats, setStats] = useState({
        users: 0,
        terms: 0,
        games: 0,
        news: 0
    });
    const [activeUsers, setActiveUsers] = useState(0);
    const [chartData, setChartData] = useState<{
        activity: number[];
        categories: { label: string; val: number }[];
    }>({
        activity: [],
        categories: []
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsData, chartsData] = await Promise.all([
                    getDashboardStats(),
                    getDashboardCharts()
                ]);
                setStats(statsData);
                setChartData(chartsData);
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            }
        };
        fetchData();

        socket.on('activeUsers', (count: number) => {
            setActiveUsers(count);
        });

        return () => {
            socket.off('activeUsers');
        };
    }, []);

    const statCards = [
        { title: 'Usuários Ativos', value: activeUsers, icon: Activity, color: 'text-green-400' },
        { title: 'Total de Usuários', value: stats.users, icon: Users, color: 'text-blue-400' },
        { title: 'Palavras', value: stats.terms, icon: Book, color: 'text-purple-400' },
        { title: 'Jogos Cadastrados', value: stats.games, icon: Gamepad2, color: 'text-orange-400' },
    ];

    const maxActivity = Math.max(...(chartData.activity || []), 10); // Avoid division by zero
    const categoryColors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'];

    // Calculate total terms for percentage in categories
    const totalCategoryTerms = chartData.categories.reduce((acc, curr) => acc + curr.val, 0) || 1;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => (
                    <StatCard key={index} {...stat} />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Chart 1: Activity */}
                <div className="bg-dark-900 border border-white/5 p-6 rounded-xl shadow-lg">
                    <h3 className="text-lg font-bold text-white mb-6">Atividade Anual (Novos Termos)</h3>
                    <div className="h-64 flex items-end justify-between gap-2 px-4">
                        {chartData.activity.length > 0 ? (
                            chartData.activity.map((val, i) => (
                                <div key={i} className="w-full bg-brand-500/20 hover:bg-brand-500/40 rounded-t transition-colors relative group" style={{ height: `${(val / maxActivity) * 100}%` }}>
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-dark-800 text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity border border-white/10 pointer-events-none">
                                        {val}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500">Carregando dados...</div>
                        )}
                    </div>
                    <div className="flex justify-between mt-4 text-xs text-gray-500 uppercase font-bold tracking-wider">
                        <span>Jan</span>
                        <span>Dez</span>
                    </div>
                </div>

                {/* Chart 2: Categories */}
                <div className="bg-dark-900 border border-white/5 p-6 rounded-xl shadow-lg">
                    <h3 className="text-lg font-bold text-white mb-6">Palavras por Gênero</h3>
                    <div className="space-y-4">
                        {chartData.categories.length > 0 ? (
                            chartData.categories.map((item, i) => {
                                const percentage = Math.round((item.val / totalCategoryTerms) * 100);
                                return (
                                    <div key={i}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-300 font-medium">{item.label}</span>
                                            <span className="text-gray-500">{item.val} ({percentage}%)</span>
                                        </div>
                                        <div className="w-full bg-dark-950 rounded-full h-2">
                                            <div className={`h-2 rounded-full ${categoryColors[i % categoryColors.length]}`} style={{ width: `${percentage}%` }}></div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500">Sem dados de categorias</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

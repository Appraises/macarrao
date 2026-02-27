import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, Crosshair, Info, Save } from 'lucide-react';
import { Button } from '../components/UI';
import { TournamentDetail as TournamentDetailType } from '../types';
import { esportsService } from '../services/esportsService';

// Sub-components
import { BracketMatchNode } from '../components/tournament/BracketMatchNode';
import { OverviewTab } from '../components/tournament/OverviewTab';
import { MatchesTab } from '../components/tournament/MatchesTab';
import { StatsTab } from '../components/tournament/StatsTab';
import { NewsTab } from '../components/tournament/NewsTab';

export const TournamentDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [mainTab, setMainTab] = useState<'Overview' | 'Matches' | 'Pickem' | 'Stats' | 'Agents' | 'News'>('Overview');
    const [subTab, setSubTab] = useState<'YourPick' | 'Leaderboard' | 'Group'>('YourPick');

    // Data State
    const [tournament, setTournament] = useState<TournamentDetailType | null>(null);
    const [loading, setLoading] = useState(true);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);

    // Pick'em State
    const [userPicks, setUserPicks] = useState<Record<string, string>>({});
    const [saved, setSaved] = useState(false);

    React.useEffect(() => {
        const fetchDetails = async () => {
            if (!id) return;
            setLoading(true);
            const data = await esportsService.getTournamentDetails(id);
            setTournament(data);

            // Fetch Leaderboard
            const lbData = await esportsService.getPickemLeaderboard();
            setLeaderboard(lbData);

            setLoading(false);
        };
        fetchDetails();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
            </div>
        );
    }

    if (!tournament) {
        return <div className="min-h-screen bg-dark-950 flex items-center justify-center text-gray-500">Tournament not found</div>;
    }

    const getMatch = (matchId: string) => tournament?.bracket?.find(m => m.id === matchId);

    const handlePick = (matchId: string, teamName: string) => {
        setUserPicks(prev => ({
            ...prev,
            [matchId]: teamName
        }));
        setSaved(false);
    };

    const savePicks = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    }

    // --- Dynamic Pick'em Logic ---
    const qf1 = getMatch('qf1');
    const qf2 = getMatch('qf2');
    const sf2 = getMatch('sf2') || { id: 'sf2', teamA: { name: 'Winthrop', score: null }, teamB: { name: 'Team Solid', score: null } };

    const sf1Projected = {
        id: 'sf1',
        teamA: { name: userPicks['qf1'] || 'TBD', score: null, isWinner: false },
        teamB: { name: userPicks['qf2'] || 'TBD', score: null, isWinner: false }
    };

    const lf1Projected = {
        id: 'lf1',
        teamA: { name: userPicks['sf2'] || 'TBD', score: null, isWinner: false },
        teamB: { name: 'TSM', score: null, isWinner: false }
    };

    const gfProjected = {
        id: 'gf',
        teamA: { name: userPicks['sf1'] || 'TBD', score: null, isWinner: false },
        teamB: { name: userPicks['lf1'] || 'TBD', score: null, isWinner: false }
    };


    return (
        <div className="min-h-screen bg-dark-950 text-[#e5e5e5] font-sans pb-12">

            {/* 1. HEADER SECTION */}
            <div className="bg-dark-900 border-b border-dark-800">
                <div className="max-w-[1400px] mx-auto px-6 py-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
                    <div className="w-24 h-24 bg-dark-950 flex items-center justify-center border border-[#333] shadow-lg shrink-0 overflow-hidden p-2">
                        {tournament.logo ? <img src={tournament.logo} alt={tournament.name} className="w-full h-full object-contain" /> : <Trophy className="w-12 h-12 text-brand-500" />}
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center gap-2 text-xs text-brand-500 font-bold uppercase tracking-wider mb-1">
                            <span className="cursor-pointer hover:underline" onClick={() => navigate('/esports')}>Esports</span>
                            <span className="text-gray-600">/</span>
                            <span>{tournament.game}</span>
                            <span className="text-gray-600">/</span>
                            <span>{tournament.name}</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight mb-4">
                            {tournament.name}: Season 2025
                        </h1>

                        <div className="flex gap-12 text-sm">
                            <div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Dates</p>
                                <p className="text-gray-300 font-medium">{tournament.dates}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Prize</p>
                                <p className="text-brand-400 font-medium">{tournament.prizePool}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Location</p>
                                <p className="flex items-center gap-1.5 text-gray-300 font-medium">
                                    <img src={`https://flagcdn.com/w20/${tournament.location.length === 2 ? tournament.location.toLowerCase() : 'xx'}.png`} className="w-4 h-3 rounded-sm opacity-80" alt="Location" />
                                    {tournament.location}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Format</p>
                                <p className="text-gray-300 font-medium">{tournament.format}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. NAVIGATION TABS */}
                <div className="max-w-[1400px] mx-auto px-6 mt-6">
                    <div className="flex gap-8 border-b border-dark-800 overflow-x-auto">
                        {['Overview', 'Matches', 'Pick\'em', 'Stats', 'Agents', 'News'].map((tab) => {
                            const cleanTab = tab.replace('\'', '') as any;
                            const displayTab = tab === 'Matches' ? 'Matches (19)' : tab === 'News' ? 'News (3)' : tab;

                            return (
                                <button
                                    key={tab}
                                    onClick={() => setMainTab(cleanTab)}
                                    className={`pb-4 text-sm font-bold uppercase tracking-wider border-b-[3px] transition-colors whitespace-nowrap ${mainTab === cleanTab ? 'border-brand-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                                >
                                    {displayTab}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* 3. SUB-NAVIGATION */}
            {mainTab === 'Pickem' && (
                <div className="bg-dark-900 border-b border-dark-800 animate-in slide-in-from-top-1">
                    <div className="max-w-[1400px] mx-auto px-6">
                        <div className="flex gap-8">
                            {['Your Pick\'em', 'Leaderboard', 'Group'].map((tab) => {
                                const cleanSub = tab.split(' ')[0] as any;
                                return (
                                    <button
                                        key={tab}
                                        onClick={() => setSubTab(cleanSub)}
                                        className={`py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${subTab === cleanSub ? 'border-brand-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                                    >
                                        {tab}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* 4. MAIN CONTENT AREA */}
            <div className="max-w-[1400px] mx-auto px-6 py-8">

                {mainTab === 'Overview' && <OverviewTab tournament={tournament as TournamentDetailType} />}
                {mainTab === 'Matches' && <MatchesTab matches={tournament.matches} />}
                {mainTab === 'Stats' && <StatsTab tournamentGame={tournament.game} tournamentId={tournament.id} />}
                {mainTab === 'News' && <NewsTab />}

                {mainTab === 'Agents' && (
                    <div className="flex flex-col items-center justify-center py-20 bg-dark-900 border border-dark-800 rounded-lg">
                        <Crosshair className="w-12 h-12 text-[#333] mb-4" />
                        <h3 className="text-gray-400 font-bold mb-2">Agent Statistics</h3>
                        <p className="text-gray-600 text-sm">Most picked and banned agents data will appear here.</p>
                    </div>
                )}

                {mainTab === 'Pickem' && (
                    <>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-500">
                                <span>Playoffs:</span>
                                <span className="text-gray-400">Bracket Prediction</span>
                            </div>
                            {Object.keys(userPicks).length > 0 && (
                                <div className="flex items-center gap-2 animate-in fade-in">
                                    {saved && <span className="text-green-500 text-xs font-bold mr-2">Picks Saved!</span>}
                                    <Button variant="primary" onClick={savePicks} className="h-8 text-xs">
                                        <Save className="w-4 h-4" /> Save Picks
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            {/* LEFT SIDE: BRACKET */}
                            <div className="lg:col-span-8 bg-dark-900 border border-dark-800 p-6 rounded min-h-[600px] overflow-x-auto relative">
                                {!Object.keys(userPicks).length && (
                                    <div className="absolute top-4 right-4 z-20 bg-brand-500/10 border border-brand-500/30 text-brand-400 p-3 rounded text-xs flex items-center gap-2">
                                        <Info className="w-4 h-4" />
                                        Click on a team to make your prediction!
                                    </div>
                                )}

                                {/* UPPER BRACKET */}
                                <div className="flex gap-16 mb-12">
                                    <div className="flex flex-col gap-8 justify-center">
                                        <BracketMatchNode
                                            title="Upper Semifinals"
                                            match={qf1}
                                            hasLineRight
                                            hasLineBottom
                                            lineHeight="h-[150%]"
                                            onPick={handlePick}
                                            userPick={userPicks['qf1']}
                                        />
                                        <div className="h-8"></div>
                                        <BracketMatchNode
                                            match={qf2}
                                            hasLineRight
                                            hasLineBottom
                                            lineHeight="h-[-50%] top-[-50%]"
                                            onPick={handlePick}
                                            userPick={userPicks['qf2']}
                                        />
                                    </div>

                                    <div className="flex flex-col justify-center">
                                        <BracketMatchNode
                                            title="Upper Final"
                                            match={sf1Projected}
                                            hasLineRight
                                            onPick={handlePick}
                                            userPick={userPicks['sf1']}
                                        />
                                    </div>

                                    <div className="flex flex-col justify-center">
                                        <BracketMatchNode
                                            title="Grand Final"
                                            match={gfProjected}
                                            isGrandFinal
                                            onPick={handlePick}
                                            userPick={userPicks['gf']}
                                        />
                                    </div>
                                </div>

                                {/* LOWER BRACKET */}
                                <div className="pt-8 border-t border-dark-800 relative">
                                    <span className="absolute -top-3 left-0 bg-dark-900 px-2 text-[10px] font-bold text-gray-500 uppercase">Lower Bracket</span>

                                    <div className="flex gap-16 mt-4">
                                        <div className="flex flex-col gap-4">
                                            <BracketMatchNode
                                                title="Lower Round 1"
                                                match={sf2}
                                                hasLineRight
                                                onPick={handlePick}
                                                userPick={userPicks['sf2']}
                                            />
                                        </div>
                                        <div className="flex flex-col justify-center">
                                            <BracketMatchNode
                                                title="Lower Final"
                                                match={lf1Projected}
                                                onPick={handlePick}
                                                userPick={userPicks['lf1']}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT SIDE: LEADERBOARD */}
                            <div className="lg:col-span-4 space-y-4">
                                <div className="flex justify-between items-center text-xs uppercase font-bold text-brand-500 mb-2">
                                    <span>Leaderboard</span>
                                    <span className="text-gray-500">Top Pick'ems</span>
                                </div>

                                <div className="flex flex-col gap-2">
                                    {leaderboard.map((entry) => (
                                        <div key={entry.rank} className="bg-dark-900 border border-dark-800 p-4 flex items-center justify-between hover:bg-dark-800 transition-colors cursor-pointer group">
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col">
                                                    <span className="text-xl font-bold text-white group-hover:text-brand-500 transition-colors">{entry.points} <span className="text-sm font-normal text-gray-500">points</span></span>
                                                    <span className="text-[10px] text-gray-500 uppercase">{entry.percentile} / {entry.rank} Users</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="block text-sm font-bold text-gray-300">{entry.user}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8 bg-dark-900 border border-dark-800 p-6 text-center">
                                    <Trophy className="w-12 h-12 text-brand-500 mx-auto mb-4 opacity-20" />
                                    <h3 className="text-white font-bold mb-2">Join the Pick'em</h3>
                                    <p className="text-sm text-gray-500 mb-4">Predict the winners and earn exclusive badges.</p>
                                    <Button variant="outline" className="w-full justify-center">Create Picks</Button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

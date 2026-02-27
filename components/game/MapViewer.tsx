import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Target, MapPin, MousePointer2, ChevronLeft } from 'lucide-react';
import { GameMap } from '../../types';

interface MapViewerProps {
    activeMap: GameMap;
    allMaps: GameMap[];
    selectedMapId: string;
    onSelectMap: (id: string) => void;
    onBack: () => void;
}

export const MapViewer: React.FC<MapViewerProps> = ({ activeMap, allMaps, selectedMapId, onSelectMap, onBack }) => {
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const [hoveredCalloutId, setHoveredCalloutId] = useState<string | null>(null);
    const [mapFilter, setMapFilter] = useState<'All' | 'Objective' | 'Callout'>('All');
    const mapContainerRef = useRef<HTMLDivElement>(null);

    // Reset zoom and pan when changing maps
    useEffect(() => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, [selectedMapId]);

    // Handle Wheel Zoom
    useEffect(() => {
        const container = mapContainerRef.current;
        if (!container) return;

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const delta = -Math.sign(e.deltaY) * 0.2;
            setZoom(z => Math.min(Math.max(z + delta, 0.5), 5));
        };

        container.addEventListener('wheel', onWheel, { passive: false });
        return () => { container.removeEventListener('wheel', onWheel); };
    }, [selectedMapId]);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        dragStartRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaY = e.clientY - dragStartRef.current.y;
        setPan(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
        dragStartRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => { setIsDragging(false); };

    const handleResetView = () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    const activeCallouts = activeMap?.callouts.filter(c => {
        if (mapFilter === 'All') return true;
        if (mapFilter === 'Objective') return c.type === 'Objective' || c.type === 'Site' || c.type === 'Spawn';
        return c.type === 'Callout';
    });

    return (
        <div className="animate-in fade-in zoom-in-95 grid grid-cols-1 lg:grid-cols-12 gap-0 h-[85vh] max-h-[900px] border border-dark-700 rounded-xl overflow-hidden bg-[#0f1014] shadow-2xl">

            {/* Left: Map Controls & List */}
            <div className="lg:col-span-3 flex flex-col bg-[#111217] border-r border-dark-700 h-full relative z-10">
                <div className="p-5 border-b border-dark-800 space-y-5 bg-[#14151a]">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-[10px] font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-widest"
                    >
                        <ChevronLeft className="w-3 h-3" /> Voltar
                    </button>

                    <div>
                        <span className="text-[10px] font-bold text-brand-500 uppercase tracking-widest block mb-1">Mapa Atual</span>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tight leading-none">{activeMap.name}</h2>
                    </div>

                    {/* Map Switcher */}
                    <div className="grid grid-cols-3 gap-2">
                        {allMaps.map(m => (
                            <button
                                key={m.id}
                                onClick={() => onSelectMap(m.id)}
                                className={`px-2 py-2 rounded text-[10px] font-bold uppercase truncate transition-all border ${selectedMapId === m.id
                                    ? 'bg-brand-500 text-black border-brand-500 shadow-[0_0_10px_rgba(14,165,233,0.3)]'
                                    : 'bg-dark-800/50 text-gray-400 border-dark-700/50 hover:border-gray-600 hover:text-gray-200 hover:bg-dark-800'
                                    }`}
                            >
                                {m.name}
                            </button>
                        ))}
                    </div>

                    {/* Filters */}
                    <div className="flex bg-black/40 p-1 rounded-lg border border-dark-700/50">
                        {['All', 'Objective', 'Callout'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setMapFilter(f as any)}
                                className={`flex-1 py-1.5 text-[10px] uppercase font-bold rounded transition-all ${mapFilter === f
                                    ? 'bg-dark-700 text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-300'
                                    }`}
                            >
                                {f === 'All' ? 'Todos' : f === 'Objective' ? 'Obj' : 'Call'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Callout List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar bg-[#111217]">
                    {activeCallouts?.map(c => (
                        <div
                            key={c.id}
                            onMouseEnter={() => setHoveredCalloutId(c.id)}
                            onMouseLeave={() => setHoveredCalloutId(null)}
                            className={`px-4 py-3 rounded-md cursor-pointer border-l-[3px] transition-all flex items-center justify-between group ${hoveredCalloutId === c.id
                                ? 'bg-dark-800 border-l-brand-500'
                                : 'bg-transparent border-l-transparent hover:bg-dark-800/50 hover:border-l-dark-600'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full shadow-sm ${c.type === 'Objective' || c.type === 'Site' ? 'bg-green-500 shadow-green-500/50' : 'bg-brand-500 shadow-brand-500/50'}`}></div>
                                <span className={`text-xs font-bold transition-colors ${hoveredCalloutId === c.id ? 'text-white' : 'text-gray-400'}`}>
                                    {c.name}
                                </span>
                            </div>
                            <MousePointer2 className={`w-3 h-3 text-gray-600 group-hover:text-brand-500 transition-opacity ${hoveredCalloutId === c.id ? 'opacity-100' : 'opacity-0'}`} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Right: Map Viewer */}
            <div className="lg:col-span-9 bg-[#08090c] relative overflow-hidden flex flex-col items-center justify-center">
                {/* Grid Background */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(14,165,233,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

                {/* Map Container */}
                <div
                    ref={mapContainerRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    className={`relative w-full h-full flex items-center justify-center z-20 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                    style={{ overflow: 'hidden' }}
                >
                    <div
                        className="relative transition-transform duration-75 ease-out origin-center select-none"
                        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
                    >
                        <div className="relative w-[70vh] aspect-square max-w-[800px] pointer-events-none">
                            <img
                                src={activeMap.tacticalImage || activeMap.image}
                                className="w-full h-full object-contain select-none"
                                alt={activeMap.name}
                                draggable={false}
                                style={{
                                    filter: 'grayscale(100%) sepia(100%) hue-rotate(180deg) saturate(350%) brightness(0.9) drop-shadow(0 0 15px rgba(14, 165, 233, 0.4))'
                                }}
                            />

                            {/* Pins */}
                            <div className="pointer-events-auto">
                                {activeCallouts?.map(c => {
                                    const isHovered = hoveredCalloutId === c.id;
                                    const isObj = c.type === 'Objective' || c.type === 'Site';

                                    return (
                                        <div
                                            key={c.id}
                                            onMouseEnter={() => setHoveredCalloutId(c.id)}
                                            onMouseLeave={() => setHoveredCalloutId(null)}
                                            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200"
                                            style={{ left: `${c.x}%`, top: `${c.y}%`, zIndex: isHovered ? 50 : 10 }}
                                        >
                                            <div className={`
                                                relative flex items-center justify-center transition-all duration-200
                                                ${isHovered ? 'scale-150' : 'scale-100'}
                                            `}>
                                                <div className={`w-3.5 h-3.5 rounded-full border-[1.5px] border-black/60 shadow-lg ${isObj ? 'bg-green-500' : 'bg-brand-500'} ${isHovered ? 'animate-pulse' : ''}`}></div>
                                                {isHovered && <div className={`absolute inset-0 rounded-full animate-ping opacity-50 ${isObj ? 'bg-green-400' : 'bg-brand-400'}`}></div>}
                                            </div>

                                            <div className={`
                                                absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1 rounded bg-black/80 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white whitespace-nowrap pointer-events-none transition-all duration-200 shadow-xl
                                                ${isHovered || zoom > 1.3 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}
                                            `}>
                                                {c.name}
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-[1px] border-4 border-transparent border-b-black/80"></div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="absolute bottom-8 right-8 flex flex-col gap-2 z-30">
                    <button onClick={() => setZoom(Math.min(zoom + 0.2, 3))} className="w-10 h-10 bg-dark-900/90 backdrop-blur border border-dark-600 rounded-lg text-gray-400 hover:text-white hover:border-brand-500 hover:bg-dark-800 shadow-xl flex items-center justify-center transition-all">
                        <ZoomIn className="w-5 h-5" />
                    </button>
                    <button onClick={() => setZoom(Math.max(zoom - 0.2, 0.5))} className="w-10 h-10 bg-dark-900/90 backdrop-blur border border-dark-600 rounded-lg text-gray-400 hover:text-white hover:border-brand-500 hover:bg-dark-800 shadow-xl flex items-center justify-center transition-all">
                        <ZoomOut className="w-5 h-5" />
                    </button>
                    <button onClick={handleResetView} className="w-10 h-10 bg-dark-900/90 backdrop-blur border border-dark-600 rounded-lg text-gray-400 hover:text-white hover:border-brand-500 hover:bg-dark-800 shadow-xl flex items-center justify-center transition-all" title="Reset">
                        <Target className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

import React from 'react';
import { Search, Loader2 } from 'lucide-react';
import { LinkedinIcon } from '../../data'; // Проверь путь до data

interface NetworkSearchProps {
    searchQuery: string;
    onSearchChange: (val: string) => void;
    onSearchSubmit: (e: React.FormEvent) => void;
    isSearching: boolean;
    searchResults: any[] | null;
    displayConnections: any[];
    onNavigate?: (tab: string) => void;
}

export const NetworkSearch = ({
    searchQuery,
    onSearchChange,
    onSearchSubmit,
    isSearching,
    searchResults,
    displayConnections,
    onNavigate
}: NetworkSearchProps) => {
    return (
        <>
            {/* Поисковая строка */}
            <form onSubmit={onSearchSubmit} className="relative animate-in fade-in duration-300">
                <input
                    type="text"
                    placeholder="Search Network (Tier 1 Fast Query)"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full bg-white border-[3px] border-black rounded-2xl p-4 pl-12 font-bold text-sm outline-none focus:border-[#38bdf8] shadow-[4px_4px_0_#000] transition-colors"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <button type="submit" disabled={isSearching} className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#111827] text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase shadow-[2px_2px_0_#38bdf8] transition-transform hover:-translate-y-0.5">
                    {isSearching ? <Loader2 size={14} className="animate-spin" /> : "Fast Find"}
                </button>
            </form>

            {/* Результаты поиска / Дефолтные мэтчи */}
            <div className="space-y-4 animate-in fade-in duration-300">
                <h2 className="text-sm font-black uppercase tracking-widest text-gray-800 mb-2">
                    {searchResults ? `Teaser Pool (${searchResults.length})` : "Matches"}
                </h2>
                {displayConnections.length === 0 ? (
                    <p className="text-center text-gray-500 font-bold py-10 border-[2px] border-dashed border-gray-300 rounded-2xl">No users found.</p>
                ) : (
                    displayConnections.map((conn: any, index: number) => (
                        <div key={conn.id || index} onClick={() => onNavigate && onNavigate('profile')} className="bg-white p-5 rounded-3xl border-[3px] border-black shadow-[4px_4px_0_#111827] relative cursor-pointer hover:-translate-y-1 hover:shadow-[6px_6px_0_#111827] transition-all">
                            <div className="flex items-start gap-4 mb-4">
                                <img src={`https://i.pravatar.cc/150?img=${conn.avatar || (index + 10)}`} className="w-14 h-14 rounded-full border-[3px] border-black shadow-[2px_2px_0_#000]" alt="avatar" />
                                <div className="flex-1 pr-10">
                                    <h3 className="font-black text-xl uppercase leading-none mb-1">{conn.name}</h3>
                                    <p className="text-[10px] font-bold text-gray-800 uppercase tracking-widest leading-tight">
                                        {conn.district || conn.role || 'Member'}
                                    </p>
                                </div>
                                <a href={conn.linkedin || '#'} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="absolute top-5 right-5 w-10 h-10 bg-[#0a66c2] border-[2px] border-black rounded-xl flex items-center justify-center shadow-[2px_2px_0_#000] hover:-translate-y-1 transition-transform">
                                    <LinkedinIcon size={18} className="text-white" />
                                </a>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </>
    );
};
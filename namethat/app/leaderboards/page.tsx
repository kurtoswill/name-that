"use client"

import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Award } from 'lucide-react';

interface LBRow { postId: string; totalVotes?: number; score?: number }

const Leaderboard = () => {
    const [activeTab, setActiveTab] = useState<'All' | 'Trending'>('All');
    const [rows, setRows] = useState<LBRow[]>([]);

    useEffect(() => {
        const load = async () => {
            if (activeTab === 'All') {
                const res = await fetch('/api/leaderboard?mode=all');
                const json = await res.json();
                setRows(json.allTime || []);
            } else {
                const res = await fetch('/api/leaderboard?mode=trending');
                const json = await res.json();
                setRows(json.trending || []);
            }
        };
        load();
    }, [activeTab]);

    const getRankStyle = (rank: number) => {
        switch (rank) {
            case 1:
                return 'bg-yellow-400 text-black border-yellow-300'; // Gold with black text
            case 2:
                return 'bg-gray-300 text-black border-gray-400'; // Silver with black text
            case 3:
                return 'bg-amber-600 text-white border-amber-700'; // Bronze with white text
            default:
                return 'bg-[#324859]/40 text-[#F3E3EA] border-[#324859]/60';
        }
    };

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1:
                return <Trophy className="w-5 h-5 text-yellow-800" />;
            case 2:
                return <Medal className="w-5 h-5 text-slate-600" />;
            case 3:
                return <Award className="w-5 h-5 text-orange-800" />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-[#12242E] text-[#F3E3EA] p-4">
            {/* Tabs */}
            <div className="flex bg-[#20333D] rounded-lg p-1 mb-6 max-w-sm mx-auto">
                {(['All', 'Trending'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            activeTab === tab
                                ? 'bg-[#324859] text-[#F3E3EA]'
                                : 'text-[#F3E3EA]/60 hover:text-[#F3E3EA]'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Leaderboard */}
            <div className="max-w-md mx-auto space-y-3">
                {rows.map((row, i) => (
                    <div
                        key={i}
                        className="bg-[#20333D]/80 backdrop-blur-sm rounded-xl p-4 border border-[#324859]/70"
                    >
                        <div className="flex items-center justify-between">
                            {/* Left Side */}
                            <div className="flex items-center space-x-4">
                                {/* Rank Badge */}
                                <div
                                    className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm font-bold ${getRankStyle(
                                        i+1
                                    )}`}
                                >
                                    {i+1 <= 3 ? getRankIcon(i+1) : i+1}
                                </div>

                                {/* Post Image */}
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#F3E3EA] to-[#E4A2B1] flex items-center justify-center text-[#12242E] font-semibold">
                                    {row.postId.slice(0,1)}
                                </div>

                                {/* Info */}
                                <div className="flex-1">
                                    <h3 className="font-semibold text-sm">Post {row.postId.slice(0,6)}...</h3>
                                    <p className="text-[#F3E3EA]/70 text-xs">
                                        {activeTab === 'All' ? `${row.totalVotes} votes` : `Score ${row.score?.toFixed(2)}`}
                                    </p>
                                </div>
                            </div>

                            {/* Right Side */}
                            <div className="flex items-center bg-[#21B65F]/20 px-3 py-1 rounded-full space-x-2 border border-[#21B65F]">
                                <span className="text-xs">
                                    {activeTab === 'All' ? `${row.totalVotes}` : `${row.score?.toFixed(2)}`}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Load More */}
            <div className="text-center mt-8">
                <button className="text-[#F3E3EA]/70 hover:text-[#F3E3EA] text-sm font-medium">
                    Load More
                </button>
            </div>
        </div>
    );
};

export default Leaderboard;

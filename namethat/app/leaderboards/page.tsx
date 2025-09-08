"use client"

import React, { useEffect, useState } from 'react';
import LeaderboardCard from '@/app/components/LeaderboardCard';

interface LBRow {
    postId: string;
    totalVotes?: number;
    score?: number;
    createdAt?: string; // ISO date string
    totalViews?: number;
}


const Leaderboard = () => {
    const [activeTab, setActiveTab] = useState<'All' | 'Trending'>('All');
    const [rows, setRows] = useState<LBRow[]>([]);


    useEffect(() => {
        const load = async () => {
            try {
                const mode = activeTab === 'All' ? 'all' : 'trending';
                const res = await fetch(`/api/leaderboard?mode=${mode}&windowDays=7&limit=10`);
                const json = await res.json();
                const rows = (json.rows || []) as LBRow[];
                setRows(rows);
            } catch (e) {
                console.error('Failed to load leaderboard', e);
                setRows([]);
            }
        };
        load();
    }, [activeTab]);

    return (
        <div className="min-h-screen bg-[#12242E] text-[#F3E3EA] p-4">
            {/* Tabs */}
            <div className="flex bg-[#20333D] rounded-lg p-1 mb-6 max-w-sm mx-auto">
                {(['All', 'Trending'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab
                                ? 'bg-[#324859] text-[#F3E3EA]'
                                : 'text-[#F3E3EA]/60 hover:text-[#F3E3EA]'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Leaderboard */}
            <div className="max-w-md mx-auto space-y-3 pb-10">
                {rows.map((row, i) => (
                    <LeaderboardCard
                        key={i}
                        rank={i + 1}
                        postId={row.postId}
                        totalVotes={row.totalVotes}
                        score={row.score}
                        activeTab={activeTab}
                        totalViews={row.totalViews}
                        createdAt={row.createdAt}
                    />
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

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

// Trending score calculation function
const calculateTrendingScore = (votes: number, views: number, createdAt: string): number => {
    const now = new Date();
    const postDate = new Date(createdAt);
    const ageInHours = Math.max(1, (now.getTime() - postDate.getTime()) / (1000 * 60 * 60));
    
    // Base engagement rate (votes per view)
    const engagementRate = views > 0 ? votes / views : 0;
    
    // Time decay factor (newer posts get higher scores)
    const timeDecay = Math.max(0.1, 1 / Math.pow(ageInHours / 24, 0.5)); // Decay over days
    
    // Vote velocity (votes per hour)
    const voteVelocity = votes / ageInHours;
    
    // Trending score formula
    const trendingScore = (
        (engagementRate * 100) + // Engagement rate component
        (voteVelocity * 10) +   // Vote velocity component
        (timeDecay * 50)        // Time decay bonus
    ) * Math.min(2, 1 + (votes / 1000)); // Scale factor for popular posts
    
    return Math.round(trendingScore * 100) / 100; // Round to 2 decimal places
};

const Leaderboard = () => {
    const [activeTab, setActiveTab] = useState<'All' | 'Trending'>('All');
    const [rows, setRows] = useState<LBRow[]>([]);

    // Sample data for visualization
    const sampleData = {
        all: [
            { postId: 'clx123abc', totalVotes: 125000, totalViews: 500000, createdAt: '2024-01-15T10:00:00Z' },
            { postId: 'clx456def', totalVotes: 89000, totalViews: 380000, createdAt: '2024-01-20T14:30:00Z' },
            { postId: 'clx789ghi', totalVotes: 67000, totalViews: 280000, createdAt: '2024-01-25T09:15:00Z' },
            { postId: 'clx012jkl', totalVotes: 54000, totalViews: 220000, createdAt: '2024-01-30T16:45:00Z' },
            { postId: 'clx345mno', totalVotes: 42000, totalViews: 180000, createdAt: '2024-02-05T11:20:00Z' },
            { postId: 'clx678pqr', totalVotes: 38000, totalViews: 160000, createdAt: '2024-02-10T13:10:00Z' },
            { postId: 'clx901stu', totalVotes: 32000, totalViews: 140000, createdAt: '2024-02-15T08:30:00Z' },
            { postId: 'clx234vwx', totalVotes: 28000, totalViews: 120000, createdAt: '2024-02-20T15:45:00Z' },
            { postId: 'clx567yza', totalVotes: 25000, totalViews: 110000, createdAt: '2024-02-25T12:00:00Z' },
            { postId: 'clx890bcd', totalVotes: 22000, totalViews: 95000, createdAt: '2024-03-01T10:30:00Z' }
        ],
        trending: [
            { postId: 'clx999trend', totalVotes: 45000, totalViews: 180000, createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() }, // 2 hours ago
            { postId: 'clx888hot', totalVotes: 38000, totalViews: 150000, createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() }, // 6 hours ago
            { postId: 'clx777viral', totalVotes: 32000, totalViews: 120000, createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() }, // 12 hours ago
            { postId: 'clx666rising', totalVotes: 28000, totalViews: 100000, createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString() }, // 18 hours ago
            { postId: 'clx555new', totalVotes: 24000, totalViews: 85000, createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() }, // 1 day ago
            { postId: 'clx444fresh', totalVotes: 21000, totalViews: 75000, createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString() }, // 1.5 days ago
            { postId: 'clx333trendy', totalVotes: 19000, totalViews: 65000, createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() }, // 2 days ago
            { postId: 'clx222buzz', totalVotes: 17000, totalViews: 55000, createdAt: new Date(Date.now() - 60 * 60 * 60 * 1000).toISOString() }, // 2.5 days ago
            { postId: 'clx111wave', totalVotes: 15000, totalViews: 45000, createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString() }, // 3 days ago
            { postId: 'clx000spark', totalVotes: 13000, totalViews: 40000, createdAt: new Date(Date.now() - 84 * 60 * 60 * 1000).toISOString() }  // 3.5 days ago
        ]
    };

    useEffect(() => {
        // Use sample data instead of API calls for now
        if (activeTab === 'All') {
            setRows(sampleData.all);
        } else {
            // Calculate trending scores for trending tab
            const trendingWithScores = sampleData.trending.map(post => ({
                ...post,
                score: calculateTrendingScore(post.totalVotes || 0, post.totalViews || 0, post.createdAt || '')
            }));
            setRows(trendingWithScores);
        }
    }, [activeTab]);

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

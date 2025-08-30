import React, { useState } from 'react';
import { Trophy, Medal, Award } from 'lucide-react';

interface LeaderboardCardProps {
    rank: number;
    postId: string;
    totalVotes?: number;
    score?: number;
    activeTab: 'All' | 'Trending';
    totalViews?: number;
    createdAt?: string;
}

const LeaderboardCard: React.FC<LeaderboardCardProps> = ({
    rank,
    postId,
    totalVotes,
    score,
    activeTab,
    totalViews,
    createdAt
}) => {
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

    // Calculate engagement rate
    const getEngagementRate = () => {
        if (!totalViews || !totalVotes) return 0;
        return Math.round((totalVotes / totalViews) * 100);
    };

    // Calculate time ago
    const getTimeAgo = () => {
        if (!createdAt) return '';
        const now = new Date();
        const postDate = new Date(createdAt);
        const diffInHours = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60));

        if (diffInHours < 1) return '<1h';
        if (diffInHours < 24) return `${diffInHours}h`;
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays}d`;
    };

    const [showTooltip, setShowTooltip] = useState(false);

    const tooltipText = activeTab === 'All'
        ? 'Percent of viewers who voted.'
        : 'Engagement rate score.';

    const zIndex = 40 - rank; // keep leaderboard cards below navbar (navbar uses z-50)

    return (
        <div
            style={{ zIndex }}
            className={`${rank === 1 ? 'relative mt-0' : 'relative mt-[-10px]'} bg-[#20333D]/80 backdrop-blur-sm rounded-xl p-4 border border-[#324859]/70 hover:bg-[#243a42] transform hover:-translate-y-1 transition-all duration-150 shadow-sm`}
        >
            <div className="flex items-center justify-between">
                {/* Left Side */}
                <div className="flex items-center space-x-4">
                    {/* Rank Badge */}
                    <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${getRankStyle(rank)} ring-1 ring-black/10`}
                    >
                        {rank <= 3 ? getRankIcon(rank) : rank}
                    </div>

                    {/* Post Image */}
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#F3E3EA] to-[#E4A2B1] flex items-center justify-center text-[#12242E] font-semibold shadow-md">
                        {postId.slice(0, 1)}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                        <h3 className="font-semibold text-sm leading-tight">Post {postId.slice(0, 6)}...</h3>
                        <p className="text-[#F3E3EA]/70 text-xs mt-1">
                            {activeTab === 'All' ? `${totalVotes?.toLocaleString()} votes` : `${getTimeAgo()} ago`}
                        </p>
                    </div>
                </div>

                {/* Right Side */}
                <div className="flex items-center space-x-2">
                    {/* interactive badge with hold-to-show tooltip */}
                    <div className="relative">
                        <div
                            role="button"
                            tabIndex={0}
                            onMouseEnter={() => setShowTooltip(true)}
                            onMouseLeave={() => setShowTooltip(false)}
                            onFocus={() => setShowTooltip(true)}
                            onBlur={() => setShowTooltip(false)}
                            className={`px-2 py-1 rounded-md border text-xs font-semibold flex items-center justify-center min-w-[44px] ${activeTab === 'All' ? 'bg-[#E4A2B1]/20 border-[#E4A2B1] text-[#E4A2B1]' : 'bg-[#21B65F]/20 border-[#21B65F] text-[#21B65F]'}`}
                        >
                            <span>{activeTab === 'All' ? `${getEngagementRate()}%` : score?.toFixed(0)}</span>
                        </div>

                        {showTooltip && (
                            <div className="absolute right-0 mt-2 w-64 md:w-56 z-20 bg-[#0f2429] text-[#F3E3EA] text-xs p-2 rounded-md border border-[#324859] shadow-lg">
                                {tooltipText}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeaderboardCard; 
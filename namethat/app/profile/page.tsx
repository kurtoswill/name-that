"use client";

import React, { useEffect, useState } from "react";
import { Trophy, Medal, Award } from "lucide-react";
import UserPostCard from '@/app/components/UserPostCard';
import { useAccount } from 'wagmi';

interface ApiPost { id: string; creator: string; description: string; imageUrl?: string | null; createdAt: string; prizeEth: string; _count?: { votes: number } }
interface ApiSuggestion { id: string; postId: string; author: string; text: string }

const ProfilePage = () => {
    const [activeTab, setActiveTab] = useState("Post");
    const { address, isConnected } = useAccount();

    const [posts, setPosts] = useState<ApiPost[]>([]);
    const [suggestionsByPost, setSuggestionsByPost] = useState<Record<string, ApiSuggestion[]>>({});

    useEffect(() => {
        const load = async () => {
            const res = await fetch('/api/posts');
            const json = await res.json();
            const items: ApiPost[] = (json.posts || []).filter((p: ApiPost) => address ? p.creator.toLowerCase() === address.toLowerCase() : false);
            setPosts(items);
            const dict: Record<string, ApiSuggestion[]> = {};
            await Promise.all(items.map(async (p) => {
                const sr = await fetch(`/api/suggestions?postId=${p.id}`);
                const sj = await sr.json();
                dict[p.id] = sj.suggestions || [];
            }));
            setSuggestionsByPost(dict);
        };
        if (address) load();
    }, [address]);

    const timeAgo = (d: string) => {
        const diff = Date.now() - new Date(d).getTime();
        const h = Math.max(1, Math.floor(diff / (1000*60*60)));
        return `${h}h ago`;
    };

    const handlePickWinner = async (postId: string, optionId: string) => {
        if (!address) return;
        await fetch('/api/winner', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId, winnerSuggestionId: optionId, caller: address }) });
        // reload posts
        const res = await fetch('/api/posts');
        const json = await res.json();
        const items: ApiPost[] = (json.posts || []).filter((p: ApiPost) => address ? p.creator.toLowerCase() === address.toLowerCase() : false);
        setPosts(items);
    };

    const leaderboardData = [];

    const getRankStyle = (rank: number) => {
        switch (rank) {
            case 1:
                return "bg-yellow-400 text-black border-yellow-300"; // Gold
            case 2:
                return "bg-gray-300 text-black border-gray-400"; // Silver
            case 3:
                return "bg-amber-600 text-white border-amber-700"; // Bronze
            default:
                return "bg-[#324859]/40 text-[#F3E3EA] border-[#324859]/60";
        }
    };

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1:
                return <Trophy className="w-5 h-5 text-black" />;
            case 2:
                return <Medal className="w-5 h-5 text-black" />;
            case 3:
                return <Award className="w-5 h-5 text-white" />;
            default:
                return null;
        }
    };

    const handlePickWinner = (postId: string, optionId: string) => {
        console.log('Pick winner for post:', postId, 'Option:', optionId);
        // Handle pick winner logic
    };

    return (
        <div className="min-h-screen bg-[#12242E] text-[#F3E3EA] p-4">

            {/* Profile Card */}
            <div className="bg-[#20333D] rounded-xl p-6 max-w-md mx-auto mb-6 text-center border border-[#324859]">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#F3E3EA] to-[#E4A2B1] flex items-center justify-center text-[#12242E] font-semibold text-2xl">
                    K
                </div>
                <h2 className="mt-4 font-semibold text-lg">Kazel Tuazon</h2>
                <p className="text-[#F3E3EA]/70 text-sm">kzlrwnjne</p>
                <p className="mt-3 text-sm text-[#F3E3EA]/80">
                    Photographer & NFT creator | Building on Base | Seeking creative alpha from the FC community
                </p>

                {/* Stats */}
                <div className="flex justify-center space-x-6 mt-4 text-center">
                    <div>
                        <div className="text-[#FBE2A7] font-semibold">{userPosts.length}</div>
                        <div className="text-[#F3E3EA]/70 text-xs">Posts</div>
                    </div>
                    <div>
                        <div className="text-[#FBE2A7] font-semibold">1.3 ETH</div>
                        <div className="text-[#F3E3EA]/70 text-xs">Total Prizes</div>
                    </div>
                    <div>
                        <div className="text-[#FBE2A7] font-semibold">245</div>
                        <div className="text-[#F3E3EA]/70 text-xs">Total Votes</div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-[#20333D] rounded-lg p-1 mb-6 max-w-sm mx-auto border border-[#324859]">
                {["Post", "Leaderboards"].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            activeTab === tab
                                ? "bg-[#24272B] text-[#E4A2B1]"
                                : "text-[#E4A2B1]/60 hover:text-[#E4A2B1]"
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Post Tab */}
            {activeTab === "Post" && (
                <div className="max-w-md mx-auto">
                    {userPosts.length > 0 ? (
                        userPosts.map((post) => (
                            <UserPostCard
                                key={post.id}
                                id={post.id}
                                author={post.author}
                                timeAgo={post.timeAgo}
                                image={post.image}
                                description={post.description}
                                nameOptions={post.nameOptions}
                                totalViews={post.totalViews}
                                totalVotes={post.totalVotes}
                                totalPrize={post.totalPrize}
                                isWalletConnected={true} // Assume connected on profile page
                                onPickWinner={(optionId) => handlePickWinner(post.id, optionId)}
                            />
                        ))
                    ) : (
                        <div className="text-center py-12">
                            <div className="text-[#FBE2A7]/70 text-lg mb-2">No posts yet</div>
                            <div className="text-[#F3E3EA]/50 text-sm">
                                Start creating posts to see them here
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Leaderboard Tab */}
            {activeTab === "Leaderboards" && (
                <div className="max-w-md mx-auto space-y-3">
                    {leaderboardData.map((user) => (
                        <div
                            key={user.id}
                            className="bg-[#20333D]/80 backdrop-blur-sm rounded-xl p-4 border border-[#324859]"
                        >
                            <div className="flex items-center justify-between">
                                {/* Left Side */}
                                <div className="flex items-center space-x-4">
                                    {/* Rank Badge */}
                                    <div
                                        className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm font-bold ${getRankStyle(
                                            user.rank
                                        )}`}
                                    >
                                        {user.rank <= 3 ? getRankIcon(user.rank) : user.rank}
                                    </div>

                                    {/* Avatar */}
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#F3E3EA] to-[#E4A2B1] flex items-center justify-center text-[#12242E] font-semibold">
                                        {user.name.charAt(0)}
                                    </div>

                                    {/* User Info */}
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-sm">{user.name}</h3>
                                        <p className="text-[#F3E3EA]/70 text-xs">
                                            by {user.username} • {user.timeAgo}
                                        </p>
                                    </div>
                                </div>

                                {/* Votes Badge */}
                                <div className="flex items-center bg-[#21B65F]/20 px-3 py-1 rounded-full space-x-2 border border-[#21B65F]">
                                    <span className="text-xs flex items-center gap-1">
                                        <p className="text-[#21B65F]">{user.votes}</p>
                                        <p className="text-[#FBE2A7]">Voted</p>
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ProfilePage;
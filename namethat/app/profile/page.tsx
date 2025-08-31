"use client";

import React, { useEffect, useState } from "react";
import { Trophy, Medal, Award, LogOut, Eye, EyeOff, Copy, Check } from "lucide-react";
import UserPostCard from '@/app/components/UserPostCard';
import { useAccount, useDisconnect } from 'wagmi';
import { useRouter } from 'next/navigation';

interface ApiPost { id: string; creator: string; description: string; imageUrl?: string | null; createdAt: string; prizeEth: string; _count?: { votes: number } }
interface ApiSuggestion { id: string; postId: string; author: string; text: string }

const ProfilePage = () => {
    const [activeTab, setActiveTab] = useState("Post");
    const [showFullAddress, setShowFullAddress] = useState(false);
    const [copied, setCopied] = useState(false);
    const { address, isConnected } = useAccount();
    const { disconnect } = useDisconnect();
    const router = useRouter();

    const handleDisconnect = () => {
        disconnect();
        router.push('/');
    };

    const formatAddress = (addr: string | undefined) => {
        if (!addr) return '';
        return showFullAddress ? addr : `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const copyToClipboard = async (text: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const [posts, setPosts] = useState<ApiPost[]>([]);
    const [suggestionsByPost, setSuggestionsByPost] = useState<Record<string, ApiSuggestion[]>>({});
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    useEffect(() => {
        const fetchUser = async () => {
            if (!address) return;
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/user?id=${address}`);
                if (!res.ok) {
                    setError('User not found');
                    setUser(null);
                } else {
                    const data = await res.json();
                    setUser(data);
                }
            } catch (e) {
                setError('Failed to fetch user');
                setUser(null);
            }
            setLoading(false);
        };
        if (address) fetchUser();
    }, [address]);

    const timeAgo = (d: string) => {
        const diff = Date.now() - new Date(d).getTime();
        const h = Math.max(1, Math.floor(diff / (1000 * 60 * 60)));
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

    // Sample post data for demonstration
    const samplePosts = [
        {
            id: '1',
            author: 'Kazel Tuazon',
            timeAgo: '2h ago',
            image: '/placeholder.jpg',
            description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
            nameOptions: [
                { id: '1', name: 'Frieren', author: '@kzlrwnjne', ethReward: '0.001 ETH', voteCount: '25k' },
                { id: '2', name: 'Frieren', author: '@kzlrwnjne', ethReward: '0.001 ETH', voteCount: '25k', hasVoted: true },
                { id: '3', name: 'Frieren', author: '@kzlrwnjne', ethReward: '0.001 ETH', voteCount: '25k' }
            ],
            totalViews: 1200,
            totalVotes: 75000
        },
        {
            id: '2',
            author: '@animefan2024',
            timeAgo: '4h ago',
            image: '/placeholder.jpg',
            description: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.',
            nameOptions: [
                { id: '4', name: 'Aria', author: '@animefan2024', ethReward: '0.002 ETH', voteCount: '18k' },
                { id: '5', name: 'Luna', author: '@otakulover', ethReward: '0.002 ETH', voteCount: '32k', hasVoted: true }
            ],
            totalViews: 856,
            totalVotes: 50000
        },
        {
            id: '3',
            author: '@mangareader',
            timeAgo: '6h ago',
            image: '/placeholder.jpg',
            description: 'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.',
            nameOptions: [
                { id: '6', name: 'Seraphina', author: '@mangareader', ethReward: '0.003 ETH', voteCount: '42k' },
                { id: '7', name: 'Nova', author: '@animeexpert', ethReward: '0.001 ETH', voteCount: '28k' },
                { id: '8', name: 'Celestia', author: '@otakumaster', ethReward: '0.002 ETH', voteCount: '55k', hasVoted: true },
                { id: '9', name: 'Aurora', author: '@weeblife', ethReward: '0.002 ETH', voteCount: '19k' }
            ],
            totalViews: 2100,
            totalVotes: 144000
        },
        {
            id: '4',
            author: '@cosplayqueen',
            timeAgo: '8h ago',
            image: '/placeholder.jpg',
            description: 'Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente delectus.',
            nameOptions: [
                { id: '10', name: 'Shadow', author: '@cosplayqueen', ethReward: '0.005 ETH', voteCount: '67k' },
                { id: '11', name: 'Kage', author: '@ninjafan', ethReward: '0.002 ETH', voteCount: '34k' },
                { id: '12', name: 'Raven', author: '@stealthmaster', ethReward: '0.003 ETH', voteCount: '89k', hasVoted: true }
            ],
            totalViews: 3700,
            totalVotes: 190000
        }
    ];

    if (loading) return <div>Loading...</div>;
    if (error) return <div>{error}</div>;

    return (
        <div className="min-h-screen bg-[#12242E] text-[#F3E3EA] p-4">

            {/* Profile Card */}
            <div className="bg-[#20333D] rounded-xl p-6 max-w-md mx-auto mb-6 text-center border border-[#324859] relative">
                {/* Logout Button */}
                {isConnected && (
                    <button
                        onClick={handleDisconnect}
                        className="absolute top-4 right-4 p-2 hover:bg-[#324859]/50 rounded-lg transition-colors"
                        title="Disconnect wallet"
                    >
                        <LogOut className="w-5 h-5 text-[#F3E3EA]/70 hover:text-[#F3E3EA]" />
                    </button>
                )}

                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#F3E3EA] to-[#E4A2B1] flex items-center justify-center text-[#12242E] font-semibold text-2xl">
                </div>
                {isConnected ? (
                    <>
                        <h2 className="mt-4 font-semibold text-lg">{user?.username || 'Loading...'}</h2>
                        <div className="flex flex-wrap items-center justify-center gap-2 text-[#F3E3EA]/70 text-sm px-4">
                            <span className="break-all max-w-[200px]">{formatAddress(address)}</span>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => setShowFullAddress(!showFullAddress)}
                                    className="p-1 hover:bg-[#324859]/50 rounded transition-colors"
                                    title={showFullAddress ? "Hide full address" : "Show full address"}
                                >
                                    {showFullAddress ?
                                        <EyeOff className="w-4 h-4" /> :
                                        <Eye className="w-4 h-4" />
                                    }
                                </button>
                                <button
                                    onClick={() => address && copyToClipboard(address)}
                                    className="p-1 hover:bg-[#324859]/50 rounded transition-colors"
                                    title="Copy address"
                                >
                                    {copied ?
                                        <Check className="w-4 h-4 text-green-500" /> :
                                        <Copy className="w-4 h-4" />
                                    }
                                </button>
                            </div>
                        </div>
                        <p className="mt-3 text-sm text-[#F3E3EA]/80">
                            Photographer & NFT creator | Building on Base | Seeking creative alpha from the FC community
                        </p>
                    </>
                ) : (
                    <div className="mt-2">
                        <button
                            onClick={() => router.push('/')}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#324859] hover:bg-[#324859]/80 text-[#F3E3EA] text-sm rounded-lg transition-colors"
                        >
                            Connect Wallet
                        </button>
                        <p className="mt-2 text-xs text-[#F3E3EA]/60">
                            Connect your wallet to view profile
                        </p>
                    </div>
                )}

                {/* Stats */}
                <div className="flex justify-center space-x-6 mt-4 text-center">
                    <div>
                        <div className="text-[#FBE2A7] font-semibold">{posts.length}</div>
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
                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab
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
                    {samplePosts.length > 0 ? (
                        samplePosts.map((post) => (
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
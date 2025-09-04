"use client";

import React, { useEffect, useState, useCallback } from "react";
import { ConnectWallet } from '@coinbase/onchainkit/wallet';
import { Trophy, Medal, Award, LogOut, Eye, EyeOff, Copy, Check } from "lucide-react";
import UserPostCard from '@/app/components/UserPostCard';
import { useAccount, useDisconnect } from 'wagmi';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ApiPost {
    id: string;
    creator: string;
    description: string;
    imageUrl?: string | null;
    createdAt: string;
    prizeEth: string;
    views?: number;
    totalVotes?: number;
    _count?: { votes: number };
}
interface ApiSuggestion {
    id: string;
    postId: string;
    author: string;
    text: string;
    authorUsername?: string | null;
    votes?: number;
}

const ProfilePage = () => {
    // Removed leaderboard tab state
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
    interface ApiUser {
        id: string;
        username?: string | null;
        // Add other user fields as needed
    }
    const [user, setUser] = useState<ApiUser | null>(null);
    const [loading, setLoading] = useState(false);
    const [postsLoading, setPostsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    // Centralized loader so we always fetch views, suggestions and votes consistently
    const loadPosts = useCallback(async () => {
        setPostsLoading(true);
        try {
            const res = await fetch('/api/posts');
            const json = await res.json();
            const items: ApiPost[] = (json.posts || []).filter((p: ApiPost) => address ? p.creator.toLowerCase() === address.toLowerCase() : false);

            // Fetch views and suggestions/votes for each post in parallel
            const dict: Record<string, ApiSuggestion[]> = {};
            const postVotes: Record<string, number> = {};

            const postsWithDetails = await Promise.all(items.map(async (p) => {
                // views
                let views = 0;
                try {
                    const viewsRes = await fetch(`/api/views?postId=${p.id}`);
                    const viewsJson = await viewsRes.json();
                    views = viewsJson?.views ?? 0;
                } catch {
                    views = 0;
                }

                // suggestions
                let suggestions: ApiSuggestion[] = [];
                try {
                    const sr = await fetch(`/api/suggestions?postId=${p.id}`);
                    const sj = await sr.json();
                    suggestions = sj.suggestions || [];
                } catch {}

                // votes for this post
                let votesForPost: { suggestionId: string }[] = [];
                try {
                    const votesRes = await fetch(`/api/votes?postId=${p.id}`);
                    const votesJson = await votesRes.json();
                    votesForPost = votesJson.votes || [];
                } catch {}

                // enrich suggestions with username and vote counts
                let totalVotes = 0;
                const suggestionsWithDetails = await Promise.all(suggestions.map(async (s: ApiSuggestion) => {
                    let authorUsername = null;
                    try {
                        const userRes = await fetch(`/api/user?id=${s.author}`);
                        const userData = await userRes.json();
                        authorUsername = userData?.username;
                    } catch {}
                    const votes = votesForPost.filter(v => v.suggestionId === s.id).length;
                    totalVotes += votes;
                    return {
                        ...s,
                        authorUsername,
                        votes,
                    };
                }));

                dict[p.id] = suggestionsWithDetails;
                postVotes[p.id] = totalVotes;

                return { ...p, views, totalVotes };
            }));

            setSuggestionsByPost(dict);
            setPosts(postsWithDetails);
        } catch (err) {
            console.error('Failed to load posts', err);
            setPosts([]);
            setSuggestionsByPost({});
        } finally {
            setPostsLoading(false);
        }
    }, [address]);

    useEffect(() => {
        if (address) loadPosts();
    }, [loadPosts, address]);

    // Track client mount to avoid SSR/client markup mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

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
            } catch {
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
        // reload posts and related data (views/votes)
        await loadPosts();
    };

    // Removed leaderboard data and helpers


    // Wait for client mount before reading wallet state to avoid hydration mismatch
    if (!mounted) {
        return null;
    }

    // If wallet isn't connected, show a clear connect prompt (don't trap users on a spinner)
    if (!isConnected || !address) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#12242E] text-[#F3E3EA] p-4">
                <div className="bg-[#20333D] rounded-xl p-6 max-w-md w-full text-center border border-[#324859]">
                    <h2 className="text-xl font-semibold mb-2">Connect your wallet</h2>
                    <p className="text-sm text-[#F3E3EA]/70 mb-4">You need to connect your wallet to view and manage your posts.</p>
                    <div className="flex justify-center">
                        <ConnectWallet className="bg-[#21B65F] hover:bg-[#1ea856] text-[#12242E] px-4 py-2 rounded-lg text-sm font-medium transition-colors" />
                        Or go back to the <Link href="/" className="text-[#E4A2B1] underline">home page</Link>.
                    </div>
                </div>
            </div>
        );
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#12242E] text-[#F3E3EA]">
            <div className="flex flex-col items-center">
                <svg className="animate-spin h-10 w-10 text-[#E4A2B1] mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                <div className="text-[#E4A2B1] text-lg font-medium">Loading profile...</div>
            </div>
        </div>
    );
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

            {/* Posts Section Only */}
            <div className="max-w-md pb-28 mx-auto">
                {postsLoading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <svg className="animate-spin h-10 w-10 text-[#E4A2B1] mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                        </svg>
                            <div className="text-[#E4A2B1] text-lg font-medium">Loading posts...</div>
                    </div>
                ) : (posts && posts.length > 0) ? (
                    posts.map((post) => (
                        <UserPostCard
                            key={post.id}
                            id={post.id}
                            author={user?.username || formatAddress(post.creator)}
                            timeAgo={timeAgo(post.createdAt)}
                            image={post.imageUrl || '/placeholder.jpg'}
                            description={post.description}
                            nameOptions={(suggestionsByPost[post.id] || []).map(s => ({
                                id: s.id,
                                name: s.text,
                                author: s.authorUsername || formatAddress(s.author),
                                ethReward: post.prizeEth + ' ETH',
                                voteCount: s.votes ?? 0,
                            }))}
                            totalViews={post.views ?? 0}
                            totalVotes={post.totalVotes ?? 0}
                            totalPrize={parseFloat(post.prizeEth)}
                            isWalletConnected={true}
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
        </div>
    );
};

export default ProfilePage;
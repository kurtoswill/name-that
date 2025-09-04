'use client';

import { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { useAccount, useBalance, useBlockNumber } from 'wagmi';
import { ConnectWallet } from '@coinbase/onchainkit/wallet';
import PostCard from '@/app/components/PostCard';
import Image from 'next/image';


interface ApiPost { id: string; creator: string; title: string; description: string; imageUrl?: string | null; createdAt: string; prizeEth: string; usdAtCreation: string; _count?: { votes: number; suggestions: number; views: number } }
interface ApiSuggestion { id: string; postId: string; author: string; text: string; votes?: number }


export default function HomePage() {
    const { address, isConnected } = useAccount();
    const { data: balance, refetch: refetchBalance } = useBalance({ address });
    // subscribe to new blocks and refetch balance when a block arrives (no polling)
    const { data: block } = useBlockNumber({ watch: true });

    useEffect(() => {
        if (typeof block === 'number' && refetchBalance) {
            // refetch balance on new block
            refetchBalance();
        }
    }, [block, refetchBalance]);

    const [username, setUsername] = useState('');
    const [posts, setPosts] = useState<ApiPost[]>([]);
    const [suggestionsByPost, setSuggestionsByPost] = useState<Record<string, ApiSuggestion[]>>({});
    const [user, setUser] = useState<any>(null);
    const [usernames, setUsernames] = useState<Record<string, string>>({});
    const [userVotes, setUserVotes] = useState<Record<string, string>>({}); // postId -> suggestionId
    const [loadingPosts, setLoadingPosts] = useState(true);

    // Always fetch posts, suggestions, and usernames on load
    useEffect(() => {
        const load = async () => {
            setLoadingPosts(true);
            // Fetch posts
            const res = await fetch('/api/posts');
            const json = await res.json();
            const items: ApiPost[] = json.posts || [];
            setPosts(items);

            // Fetch suggestions for each post
            const dict: Record<string, ApiSuggestion[]> = {};
            await Promise.all(items.map(async (p) => {
                const srRes = await fetch(`/api/suggestions?postId=${p.id}`);
                const sj = await srRes.json();
                dict[p.id] = sj.suggestions || [];
            }));
            setSuggestionsByPost(dict);

            // Fetch usernames for post creators and suggestion authors
            const uniqueAddresses = new Set<string>();
            items.forEach(post => uniqueAddresses.add(post.creator));
            Object.values(dict).flat().forEach(s => uniqueAddresses.add(s.author));

            const usernameDict: Record<string, string> = {};
            await Promise.all([...uniqueAddresses].map(async (address) => {
                const ur = await fetch('/api/user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: address })
                });
                if (ur.ok) {
                    const userData = await ur.json();
                    usernameDict[address] = userData.username || `User${address.slice(-6)}`;
                }
            }));
            setUsernames(usernameDict);
            setLoadingPosts(false);
        };
        load();
    }, []); // Only run on initial load

    // Fetch user votes only when wallet is connected
    useEffect(() => {
        if (!isConnected || !address) return;
        const fetchVotes = async () => {
            const votesRes = await fetch(`/api/votes?voter=${address}`);
            if (votesRes.ok) {
                const votesJson = await votesRes.json();
                // votes: [{ postId, suggestionId, ... }]
                const voteMap: Record<string, string> = {};
                (votesJson.votes || []).forEach((v: any) => {
                    if (v.postId && v.suggestionId) voteMap[v.postId] = v.suggestionId;
                });
                setUserVotes(voteMap);
            }
        };
        fetchVotes();
    }, [isConnected, address]);

    useEffect(() => {
    const syncUser = async () => {
        if (!address) return;
        const res = await fetch('/api/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: address })
        });
        if (!res.ok) {
            // Optionally log the error response
            const text = await res.text();
            console.error('User API error:', res.status, text);
            return;
        }
        const data = await res.json();
        setUser(data);
        setUsername(data.username || `User${address.slice(-6)}`);
    };
    if (isConnected && address) {
        syncUser();
    }
}, [isConnected, address]);


    // Record a view and update the UI with the new view count
    const recordView = async (postId: string) => {
        if (!address) return;
        await fetch('/api/views', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId, viewerId: address })
        });
        // Fetch the new view count and update the posts state
        const res = await fetch(`/api/views?postId=${postId}`);
        const data = await res.json();
        if (typeof data.views === 'number') {
            setPosts(prevPosts => prevPosts.map(post =>
                post.id === postId
                    ? {
                        ...post,
                        _count: {
                            votes: post._count?.votes ?? 0,
                            suggestions: post._count?.suggestions ?? 0,
                            views: data.views
                        }
                    }
                    : post
            ));
        }
    };

    const handleAddName = async (postId: string, newName: string, setAddNameError: (msg: string) => void) => {
        if (!address) return;
        // Record view when adding suggestion
        await recordView(postId);
        const res = await fetch('/api/suggestions', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId, author: address, text: newName })
        });
        if (res.status === 409) {
            setAddNameError('You have already suggested a name for this post. Only one suggestion per user is allowed.');
            return;
        }
        // refresh suggestions
        const sr = await fetch(`/api/suggestions?postId=${postId}`);
        const sj = await sr.json();
        setSuggestionsByPost(prev => ({ ...prev, [postId]: sj.suggestions || [] }));
        setAddNameError(''); // Success: trigger modal close in PostCard
    };

    const handleVote = async (postId: string, optionId: string) => {
        if (!address) return;
        // Record view when voting
        await recordView(postId);
        await fetch('/api/votes', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId, suggestionId: optionId, voter: address })
        });
    };

    const timeAgo = (d: string) => {
        const diff = Date.now() - new Date(d).getTime();
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const weeks = Math.floor(days / 7);
        const months = Math.floor(days / 30);
        const years = Math.floor(days / 365);

        if (years > 0) {
            return `${years}y ago`;
        } else if (months > 0) {
            return `${months}mo ago`;
        } else if (weeks > 0) {
            return `${weeks}w ago`;
        } else if (days > 0) {
            return `${days}d ago`;
        } else if (hours > 0) {
            return `${hours}h ago`;
        } else {
            return `${Math.max(1, minutes)}m ago`;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#1a2f3a] to-[#12242E] text-[#F3E3EA] relative overflow-hidden">
            {/* Background gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#1a2f3a]/80 to-[#12242E]/90"></div>

            {/* Header with wallet connection only */}
            <div className="sticky top-0 z-20 p-4">
                <div className="flex items-center justify-between">
                    <Image src="/namethat-logo.png" alt="NameThat Logo" width={60} height={60} className="mr-2" />
                    {!isConnected ? (
                        <div className="mini-app-theme" style={{ touchAction: 'manipulation' }}>
                            <ConnectWallet className="bg-[#21B65F] hover:bg-[#1ea856] text-[#12242E] px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer">
                                <span>Connect Wallet</span>
                            </ConnectWallet>
                        </div>
                    ) : (
                        <a href="/profile" className="group" aria-label="Open profile" title="Open profile">
                            <div className="flex items-center bg-[#20333D]/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-[#324859]/50 cursor-pointer hover:scale-[1.01] transition-transform">
                                <div className="w-2 h-2 bg-[#21B65F] rounded-full mr-2" />
                                <div className="text-sm flex items-center">
                                    <div>
                                        <div className="text-[#F3E3EA] font-medium">{username}</div>
                                        <div className="text-[#FBE2A7]/70 text-xs">
                                            {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : '0.0000 ETH'}
                                        </div>
                                    </div>
                                    <ExternalLink size={14} className="ml-3 text-[#FBE2A7]/70 opacity-90 transform transition-transform group-hover:translate-x-1" />
                                </div>
                            </div>
                        </a>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-4">
                {/* Glowing NameThat Title */}
                <div className="text-center mb-16 relative">
                    <div className="relative inline-block">
                        <Image
                            src="/NameThat.svg"
                            alt="NameThat"
                            width={320}
                            height={80}
                            className="w-64 md:w-80 h-auto animate-glow"
                            style={{
                                filter: 'drop-shadow(0 0 20px rgba(228, 162, 177, 0.6)) drop-shadow(0 0 40px rgba(251, 226, 167, 0.4))'
                            }}
                        />
                    </div>
                </div>

                {/* Anime Character Carousel */}
                <div className="relative w-full max-w-4xl">
                    <div className="flex items-center justify-center">
                        {/* Left character (blurred) */}
                        <div className="absolute left-0 transform -translate-x-1/2 w-48 h-48 opacity-60 blur-sm animate-float" style={{ animationDelay: '0.5s' }}>
                            <div className="w-full h-full bg-gradient-to-br from-[#E4A2B1] to-[#FBE2A7] rounded-lg p-1">
                                <div className="w-full h-full bg-[#20333D] rounded-lg flex items-center justify-center">
                                    <div className="text-center text-white/60">
                                        <div className="w-16 h-16 bg-[#324859] rounded-full mx-auto mb-2"></div>
                                        <div className="text-xs">Character</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Center character (focused) */}
                        <div className="relative z-10 w-64 h-64 animate-float">
                            <div className="w-full h-full bg-gradient-to-br from-[#E4A2B1] to-[#FBE2A7] rounded-xl p-2 shadow-2xl animate-glow">
                                <div className="w-full h-full bg-[#20333D] rounded-lg flex items-center justify-center relative overflow-hidden">
                                    {/* Character placeholder - you can replace with actual images */}
                                    <div className="text-center text-white">
                                        <div className="w-24 h-24 bg-gradient-to-br from-[#E4A2B1] to-[#FBE2A7] rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse-glow">
                                            <div className="w-16 h-16 bg-[#324859] rounded-full"></div>
                                        </div>
                                        <div className="text-lg font-semibold mb-2 text-glow">Anime Character</div>
                                        <div className="text-sm text-white/70">Guess the name!</div>
                                    </div>
                                    {/* Enhanced glow effect */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#E4A2B1]/20 to-[#FBE2A7]/20 rounded-lg blur-xl animate-pulse-glow"></div>
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#E4A2B1]/10 to-[#FBE2A7]/10 rounded-lg blur-2xl animate-pulse-glow" style={{ animationDelay: '2s' }}></div>
                                </div>
                            </div>
                        </div>

                        {/* Right character (blurred) */}
                        <div className="absolute right-0 transform translate-x-1/2 w-48 h-48 opacity-60 blur-sm animate-float" style={{ animationDelay: '1.5s' }}>
                            <div className="w-full h-full bg-gradient-to-br from-[#E4A2B1] to-[#FBE2A7] rounded-lg p-1">
                                <div className="w-full h-full bg-[#20333D] rounded-lg flex items-center justify-center">
                                    <div className="text-center text-white/60">
                                        <div className="w-16 h-16 bg-[#324859] rounded-full mx-auto mb-2"></div>
                                        <div className="text-xs">Character</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scroll indicator */}
                <div className="mt-16 text-center text-[#FBE2A7]/80 animate-float" style={{ animationDelay: '2.5s' }}>
                    <div className="w-6 h-6 mx-auto mb-2">
                        <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
                            {/* Double upward-pointing chevron/arrow */}
                            <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
                            <path d="M7.41 11.41L12 6.83l4.59 4.58L18 10l-6-6-6 6z" />
                        </svg>
                    </div>
                    <div className="text-sm">Scroll up</div>
                </div>
            </div>

            {/* Posts Section */}
            <div className="relative z-0 p-4 pb-32 mt-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    {loadingPosts ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <svg className="animate-spin h-10 w-10 text-[#E4A2B1] mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                            </svg>
                            <div className="text-[#E4A2B1] text-lg font-medium">Loading posts...</div>
                        </div>
                    ) : (
                        posts.map((post) => {
                            const suggestions = suggestionsByPost[post.id] || [];
                            const nameOptions = suggestions.map(s => ({
                                id: s.id,
                                name: s.text,
                                author: usernames[s.author] || s.author,
                                ethReward: post.prizeEth + ' ETH',
                                voteCount: s.votes?.toString() || '0'
                            }));
                            const votedSuggestionId = userVotes[post.id];
                            return (
                                <PostCard
                                    key={post.id}
                                    id={post.id}
                                    author={usernames[post.creator] || post.creator}
                                    timeAgo={timeAgo(post.createdAt)}
                                    image={post.imageUrl || '/placeholder.jpg'}
                                    description={post.description}
                                    nameOptions={nameOptions}
                                    totalViews={post._count?.views ?? 0}
                                    totalVotes={post._count?.votes || 0}
                                    totalPrize={parseFloat(post.prizeEth)}
                                    isWalletConnected={isConnected}
                                    votedSuggestionId={votedSuggestionId}
                                    onAddName={(newName, setAddNameError) => handleAddName(post.id, newName, setAddNameError)}
                                    onVote={(optionId) => handleVote(post.id, optionId)}
                                />
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
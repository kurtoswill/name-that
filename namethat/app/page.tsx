'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, ArrowUp } from 'lucide-react';
import { useAccount, useBalance, useBlockNumber } from 'wagmi';
import WalletConnectMenu from '@/app/components/WalletConnectMenu';
import PostCard from '@/app/components/PostCard';
import Image from 'next/image';

interface ApiPost { id: string; creator: string; title: string; description: string; imageUrl?: string | null; createdAt: string; prizeEth: string; usdAtCreation: string; _count?: { votes: number; suggestions: number; views: number } }
interface ApiSuggestion { id: string; postId: string; author: string; text: string; votes?: number }

interface ApiUser {
    id: string;
    username?: string;
    // Add other user properties here if needed
}

export default function HomePage() {
    const [isHydrated, setIsHydrated] = useState(false);
    useEffect(() => { setIsHydrated(true); }, []);
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
    const [user, setUser] = useState<ApiUser | null>(null);
    const [usernames, setUsernames] = useState<Record<string, string>>({});
    const [userVotes, setUserVotes] = useState<Record<string, string>>({}); // postId -> suggestionId
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [scrollY, setScrollY] = useState(0);

    // Show scroll-to-top button when user scrolls down
    useEffect(() => {
        const handleScroll = () => {
            // Appear sooner on shorter pages
            const y = window.scrollY || 0;
            setScrollY(y);
            setShowScrollTop(y > 300);
        };

        window.addEventListener('scroll', handleScroll);
        // run once to set initial value
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Scroll to top function
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

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
    <div className="min-h-screen bg-gradient-to-b from-[#1a2f3a] to-[#12242E] text-[#F3E3EA] relative overflow-visible"></div>
    // Fetch user votes only when wallet is connected
    useEffect(() => {
        if (!isConnected || !address) return;
        const fetchVotes = async () => {
            const votesRes = await fetch(`/api/votes?voter=${address}`);
            if (votesRes.ok) {
                const votesJson = await votesRes.json();
                // votes: [{ postId, suggestionId, ... }]
                const voteMap: Record<string, string> = {};
                interface ApiVote { postId: string; suggestionId: string }
                (votesJson.votes || []).forEach((v: ApiVote) => {
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
        <div className="min-h-screen bg-gradient-to-b from-[#1a2f3a] to-[#12242E] text-[#F3E3EA] relative overflow-visible">
            
            {/* Background gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#1a2f3a]/80 to-[#12242E]/90"></div>

            {/* Fixed Header with wallet connection */}
            <div className="fixed top-0 left-0 right-0 z-50 p-4 border-b-2 border-[#324859]/50 backdrop-blur-sm bg-[#1a3643]">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <Image src="/namethat-logo.png" alt="NameThat Logo" width={60} height={60} className="mr-2" />
                    {!isHydrated ? (
                        // Stable placeholder while hydrating to avoid SSR/CSR mismatch
                        <div className="w-32 h-10" />
                    ) : !isConnected ? (
                        <div className="mini-app-theme" style={{ touchAction: 'manipulation' }}>
                            <WalletConnectMenu />
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
            {/* Scroll to top button */}
            {showScrollTop && (
                <button
                    onClick={scrollToTop}
                    style={{ zIndex: 99999 }}
                    className="fixed bottom-28 right-6 p-3 bg-[#21B65F] hover:bg-[#1ea856] text-white rounded-full shadow-lg transition-all duration-300 hover:scale-110"
                    aria-label="Scroll to top"
                >
                    <ArrowUp size={20} />
                </button>
            )}
            {/* Main Content - Add padding to account for fixed header */}
            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-0 pt-24">
                {/* Posts Section */}
                <div className="relative z-0 p-4 pb-32 w-full max-w-4xl mx-auto">
                    <div className="space-y-6">
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
                                    // keep raw author address for ownership checks
                                    author: s.author,
                                    // separate display-friendly author name
                                    authorDisplay: usernames[s.author] || s.author,
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

        </div>
    );
}
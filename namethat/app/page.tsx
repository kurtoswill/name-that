'use client';

import { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { ConnectWallet } from '@coinbase/onchainkit/wallet';
import PostCard from '@/app/components/PostCard';

interface ApiPost { id: string; creator: string; title: string; description: string; imageUrl?: string | null; createdAt: string; prizeEth: string; usdAtCreation: string; _count?: { votes: number; suggestions: number } }
interface ApiSuggestion { id: string; postId: string; author: string; text: string }

export default function HomePage() {
    const { address, isConnected } = useAccount();
    const { data: balance } = useBalance({ address });

    const [username, setUsername] = useState('');
    const [posts, setPosts] = useState<ApiPost[]>([]);
    const [suggestionsByPost, setSuggestionsByPost] = useState<Record<string, ApiSuggestion[]>>({});

    useEffect(() => {
        if (address) setUsername(`User${address.slice(-4)}`);
    }, [address]);

    useEffect(() => {
        const load = async () => {
            const res = await fetch('/api/posts');
            const json = await res.json();
            const items: ApiPost[] = json.posts || [];
            setPosts(items);
            // fetch suggestions for each post (lightweight)
            const dict: Record<string, ApiSuggestion[]> = {};
            await Promise.all(items.map(async (p) => {
                const sr = await fetch(`/api/suggestions?postId=${p.id}`);
                const sj = await sr.json();
                dict[p.id] = sj.suggestions || [];
            }));
            setSuggestionsByPost(dict);
        };
        load();
    }, []);

    const handleAddName = async (postId: string, newName: string) => {
        if (!address) return;
        await fetch('/api/suggestions', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId, author: address, text: newName })
        });
        // refresh suggestions
        const sr = await fetch(`/api/suggestions?postId=${postId}`);
        const sj = await sr.json();
        setSuggestionsByPost(prev => ({ ...prev, [postId]: sj.suggestions || [] }));
    };

    const handleVote = async (postId: string, optionId: string) => {
        if (!address) return;
        await fetch('/api/votes', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId, suggestionId: optionId, voter: address })
        });
    };

    const timeAgo = (d: string) => {
        const diff = Date.now() - new Date(d).getTime();
        const h = Math.max(1, Math.floor(diff / (1000*60*60)));
        return `${h}h ago`;
    };

    return (
        <div className="min-h-screen bg-[#12242E] text-[#F3E3EA]">
            {/* Header */}
            <div className="sticky top-0 bg-[#12242E] z-10 border-b border-[#324859]/30">
                <div className="flex items-center justify-between p-4">
                    <h1 className="text-xl font-semibold">NameThat</h1>

                    {/* Wallet Connection */}
                    {!isConnected ? (
                        <div className="mini-app-theme">
                            <ConnectWallet className="bg-[#21B65F] hover:bg-[#1ea856] text-[#12242E] px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                                <span>Connect Wallet</span>
                            </ConnectWallet>
                        </div>
                    ) : (
                        <a href="/profile">
                            <div className="flex items-center bg-[#20333D] px-3 py-2 rounded-lg border border-[#324859]">
                                <div className="w-2 h-2 bg-[#21B65F] rounded-full mr-2"></div>
                                <div className="text-sm">
                                    <div className="text-[#F3E3EA] font-medium">{username}</div>
                                    <div className="text-[#FBE2A7]/70 text-xs">
                                        {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : '0.0000 ETH'}
                                    </div>
                                </div>
                            </div>
                        </a>
                    )}
                </div>
            </div>

            {/* Post Feed */}
            <div className="p-4 pb-24">
                {posts.map((post) => {
                    const sug = suggestionsByPost[post.id] || [];
                    const nameOptions = sug.slice(0,5).map((s) => ({ id: s.id, name: s.text, author: s.author, ethReward: '—', hasVoted: false }));
                    return (
                        <PostCard
                            key={post.id}
                            id={post.id}
                            author={`${post.creator.slice(0,6)}...${post.creator.slice(-4)}`}
                            timeAgo={timeAgo(post.createdAt)}
                            image={post.imageUrl || ''}
                            description={post.description}
                            nameOptions={nameOptions}
                            totalViews={0}
                            totalVotes={post._count?.votes || 0}
                            totalPrize={parseFloat(post.prizeEth)}
                            isWalletConnected={isConnected}
                            onAddName={(newName) => handleAddName(post.id, newName)}
                            onVote={(optionId) => handleVote(post.id, optionId)}
                        />
                    );
                })}
            </div>
        </div>
    );
}
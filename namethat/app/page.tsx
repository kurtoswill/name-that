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
        <div className="min-h-screen bg-gradient-to-b from-[#1a2f3a] to-[#12242E] text-[#F3E3EA] relative overflow-hidden">
            {/* Background gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#1a2f3a]/80 to-[#12242E]/90"></div>
            
            {/* Header with wallet connection only */}
            <div className="sticky top-0 z-20 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold text-[#F3E3EA]">NameThat</h1>
                    {!isConnected ? (
                        <div className="mini-app-theme">
                            <ConnectWallet className="bg-[#21B65F] hover:bg-[#1ea856] text-[#12242E] px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                                <span>Connect Wallet</span>
                            </ConnectWallet>
                        </div>
                    ) : (
                        <a href="/profile">
                            <div className="flex items-center bg-[#20333D]/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-[#324859]/50">
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

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-4">
                {/* Glowing NameThat Title */}
                <div className="text-center mb-16 relative">
                    <div className="relative inline-block">
                        <img 
                            src="/NameThat.svg" 
                            alt="NameThat" 
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
                        <div className="absolute left-0 transform -translate-x-1/2 w-48 h-48 opacity-60 blur-sm animate-float" style={{animationDelay: '0.5s'}}>
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
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#E4A2B1]/10 to-[#FBE2A7]/10 rounded-lg blur-2xl animate-pulse-glow" style={{animationDelay: '2s'}}></div>
                                </div>
                            </div>
                        </div>

                        {/* Right character (blurred) */}
                        <div className="absolute right-0 transform translate-x-1/2 w-48 h-48 opacity-60 blur-sm animate-float" style={{animationDelay: '1.5s'}}>
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
                <div className="mt-16 text-center text-[#FBE2A7]/80 animate-float" style={{animationDelay: '2.5s'}}>
                    <div className="w-6 h-6 mx-auto mb-2">
                        <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
                            {/* Double upward-pointing chevron/arrow */}
                            <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
                            <path d="M7.41 11.41L12 6.83l4.59 4.58L18 10l-6-6-6 6z"/>
                        </svg>
                    </div>
                    <div className="text-sm">Scroll up</div>
                </div>
            </div>

            {/* Posts Section */}
            <div className="relative z-0 p-4 pb-24 mt-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    {samplePosts.map((post) => (
                        <PostCard
                            key={post.id}
                            id={post.id}
                            author={post.author}
                            timeAgo={post.timeAgo}
                            image={post.image}
                            description={post.description}
                            nameOptions={post.nameOptions}
                            totalViews={post.totalViews}
                            totalVotes={post.totalVotes}
                            isWalletConnected={isConnected}
                            onAddName={(newName) => handleAddName(post.id, newName)}
                            onVote={(optionId) => handleVote(post.id, optionId)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
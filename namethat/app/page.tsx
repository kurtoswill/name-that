'use client';

import { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { ConnectWallet } from '@coinbase/onchainkit/wallet';
import PostCard from '@/app/components/PostCard';

export default function HomePage() {
    const { address, isConnected } = useAccount();
    const { data: balance } = useBalance({ address });

    const [username, setUsername] = useState('');

    // Mock username generation from address
    useEffect(() => {
        if (address) {
            // Generate a simple username from address
            setUsername(`User${address.slice(-4)}`);
        }
    }, [address]);

    // Mock data for posts
    const mockPosts = [
        {
            id: '1',
            author: 'Kazel Tuazon',
            timeAgo: '2h ago',
            image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=300&fit=crop',
            description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
            nameOptions: [
                {
                    id: '1',
                    name: 'Frieren',
                    author: 'kzirwinjxe',
                    votes: 25,
                    ethReward: '0.0001 ETH',
                    hasVoted: false
                },
                {
                    id: '2',
                    name: 'Frieren',
                    author: 'kzirwinjxe',
                    votes: 18,
                    ethReward: '0.0001 ETH',
                    hasVoted: false
                },
                {
                    id: '3',
                    name: 'Frieren',
                    author: 'kzirwinjxe',
                    votes: 12,
                    ethReward: '0.0001 ETH',
                    hasVoted: false
                }
            ],
            totalViews: 1200,
            totalVotes: 75
        },
        {
            id: '2',
            author: 'Jane Smith',
            timeAgo: '4h ago',
            image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&h=300&fit=crop',
            description: 'Help me name my new puppy! She loves to play and has a very energetic personality. Looking for something cute and memorable.',
            nameOptions: [
                {
                    id: '4',
                    name: 'Luna',
                    author: 'dogLover99',
                    votes: 42,
                    ethReward: '0.0001 ETH',
                    hasVoted: false
                },
                {
                    id: '5',
                    name: 'Bella',
                    author: 'petNames',
                    votes: 38,
                    ethReward: '0.0001 ETH',
                    hasVoted: false
                },
                {
                    id: '6',
                    name: 'Zoe',
                    author: 'nameGuru',
                    votes: 29,
                    ethReward: '0.0001 ETH',
                    hasVoted: false
                }
            ],
            totalViews: 850,
            totalVotes: 109
        },
        {
            id: '3',
            author: 'Alex Chen',
            timeAgo: '6h ago',
            image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop',
            description: 'Starting a new coffee shop and need the perfect name. The vibe is cozy, modern, and community-focused. Prize pool is generous for the winning suggestion!',
            nameOptions: [
                {
                    id: '7',
                    name: 'Brew Haven',
                    author: 'coffeeAddict',
                    votes: 67,
                    ethReward: '0.0001 ETH',
                    hasVoted: false
                },
                {
                    id: '8',
                    name: 'The Daily Grind',
                    author: 'businessNamer',
                    votes: 52,
                    ethReward: '0.0001 ETH',
                    hasVoted: false
                },
                {
                    id: '9',
                    name: 'Community Cup',
                    author: 'localCafe',
                    votes: 44,
                    ethReward: '0.0001 ETH',
                    hasVoted: false
                }
            ],
            totalViews: 2100,
            totalVotes: 163
        }
    ];

    const handleAddName = (postId: string) => {
        console.log('Add name to post:', postId);
        // Handle add name logic
    };

    const handleVote = (postId: string, optionId: string) => {
        console.log('Vote for option:', optionId, 'in post:', postId);
        // Handle voting logic
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
                        <div className="flex items-center bg-[#20333D] px-3 py-2 rounded-lg border border-[#324859]">
                            <div className="w-2 h-2 bg-[#21B65F] rounded-full mr-2"></div>
                            <div className="text-sm">
                                <div className="text-[#F3E3EA] font-medium">{username}</div>
                                <div className="text-[#FBE2A7]/70 text-xs">
                                    {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : '0.0000 ETH'}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Post Feed */}
            <div className="p-4 pb-24">
                {mockPosts.map((post) => (
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
                        onAddName={() => handleAddName(post.id)}
                        onVote={(optionId) => handleVote(post.id, optionId)}
                    />
                ))}
            </div>
        </div>
    );
}
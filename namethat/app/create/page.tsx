/* eslint-disable @typescript-eslint/no-unused-vars */

'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useAccount, useConnect } from 'wagmi';
import { ConnectWallet, Wallet as OnchainWallet } from '@coinbase/onchainkit/wallet';

export default function CreatePage() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [ethPrize, setEthPrize] = useState('0.00027');
    const [usdPrize, setUsdPrize] = useState('1.25');
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [ethToUsdRate, setEthToUsdRate] = useState(4630); // Default rate
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    const { address, isConnected } = useAccount();

    // Fetch ETH to USD conversion rate
    const fetchEthRate = async () => {
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
            const data = await response.json();
            const rate = data.ethereum.usd;
            setEthToUsdRate(rate);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Failed to fetch ETH rate:', error);
        }
    };

    // Update rates every minute
    useEffect(() => {
        fetchEthRate(); // Initial fetch
        const interval = setInterval(fetchEthRate, 60000); // Update every 60 seconds
        return () => clearInterval(interval);
    }, []);

    // Update USD when ETH changes (no longer allow USD input)
    const handleEthChange = (value: string) => {
        setEthPrize(value);
        const usdValue = (parseFloat(value) * ethToUsdRate).toFixed(2);
        setUsdPrize(usdValue);
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setUploadedFile(file);
        }
    };

    const handlePost = async () => {
        if (!isConnected) {
            alert('Please connect your wallet to post');
            return;
        }
        if (!title || !description) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            // Handle post submission logic here
            const postData = {
                title,
                description,
                ethPrize: parseFloat(ethPrize),
                usdPrize: parseFloat(usdPrize),
                file: uploadedFile,
                walletAddress: address,
                prizeDistribution: {
                    winner: 0.5, // 50% to winner
                    voters: 0.3, // 30% to voters of winning name
                    creators: 0.2 // 20% to creators
                }
            };

            console.log('Posting:', postData);
            // Add your post submission API call here

        } catch (error) {
            console.error('Failed to post:', error);
            alert('Failed to create post. Please try again.');
        }
    };

    return (
        <div className="min-h-screen bg-[#12242E] text-[#F3E3EA] p-4">
            {/* Header with back button and wallet connection */}
            <div className="flex items-center justify-between mb-8 pt-4">
                <div className="flex items-center">
                    <Link href="/" className="mr-4">
                        <ArrowLeft size={24} className="text-[#E4A2B1]" />
                    </Link>
                    <h1 className="text-xl font-semibold">Create Post</h1>
                </div>

                {/* Wallet Connection in Header */}
                {!isConnected && (
                    <div className="mini-app-theme">
                        <ConnectWallet className="bg-[#21B65F] hover:bg-[#1ea856] text-[#12242E] px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                            <span>Connect Wallet</span>
                        </ConnectWallet>
                    </div>
                )}

                {isConnected && (
                    <div className="flex items-center text-xs text-[#21B65F]">
                        <div className="w-2 h-2 bg-[#21B65F] rounded-full mr-2"></div>
                        {address && `${address.slice(0, 4)}...${address.slice(-4)}`}
                    </div>
                )}
            </div>

            <div className="space-y-6">
                {/* Title */}
                <div>
                    <label className="block text-lg font-medium mb-3">Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Input color"
                        className="w-full p-4 bg-[#20333D] border border-[#324859] rounded-lg text-[#F3E3EA] placeholder-[#FBE2A7]/50 focus:outline-none focus:border-[#E4A2B1] transition-colors"
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-lg font-medium mb-3">Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Input color"
                        rows={4}
                        className="w-full p-4 bg-[#20333D] border border-[#324859] rounded-lg text-[#F3E3EA] placeholder-[#FBE2A7]/50 focus:outline-none focus:border-[#E4A2B1] transition-colors resize-none"
                    />
                </div>

                {/* Upload File */}
                <div>
                    <label className="block text-lg font-medium mb-3">Upload File</label>
                    <div className="relative">
                        <input
                            type="file"
                            accept=".jpeg,.jpg,.mp4,.mp3"
                            onChange={handleFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="w-20 h-20 bg-[#20333D] border border-[#324859] rounded-lg flex items-center justify-center cursor-pointer hover:border-[#E4A2B1] transition-colors">
                            <Plus size={24} className="text-[#E4A2B1]" />
                        </div>
                    </div>
                </div>

                {/* Prize Pool */}
                <div>
                    <label className="block text-lg font-medium mb-3">Prize Pool</label>
                    <div className="flex justify-between text-xs text-[#E4A2B1]/70 mb-3">
                        <span>Minimum: 0.00022 ETH</span>
                        <span>Rate updated: {lastUpdated.toLocaleTimeString()}</span>
                    </div>
                    <div className="bg-[#20333D] border border-[#324859] rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    type="number"
                                    step="0.00001"
                                    value={ethPrize}
                                    onChange={(e) => handleEthChange(e.target.value)}
                                    className="bg-transparent text-2xl font-medium text-[#F3E3EA] focus:outline-none w-32"
                                    placeholder="0.00022"
                                />
                                <span className="text-[#FBE2A7]/70 ml-2">ETH</span>
                            </div>
                            <div className="flex items-center text-right">
                                <span className="text-lg text-[#FBE2A7]/70">$</span>
                                <span className="text-lg text-[#F3E3EA] ml-1">{usdPrize}</span>
                                <span className="text-[#FBE2A7]/70 ml-1 text-sm">USD</span>
                            </div>
                        </div>
                    </div>

                    {/* Distribution breakdown - smaller and at bottom */}
                    <div className="flex justify-between text-xs text-center mt-3">
                        <div className="text-[#21B65F]">
                            Winner: {(parseFloat(ethPrize) * 0.5).toFixed(5)} ETH
                        </div>
                        <div className="text-[#E4A2B1]">
                            Voters: {(parseFloat(ethPrize) * 0.3).toFixed(5)} ETH
                        </div>
                        <div className="text-[#F59E0B]">
                            Platform: {(parseFloat(ethPrize) * 0.2).toFixed(5)} ETH
                        </div>
                    </div>
                </div>
            </div>

            {/* Post Button */}
            <div className="mt-8">
                <button
                    onClick={handlePost}
                    disabled={!isConnected}
                    className={`w-full py-4 rounded-lg text-lg font-medium transition-colors ${
                        isConnected
                            ? 'bg-[#FBE2A7] text-[#12242E] hover:bg-[#F5D982]'
                            : 'bg-[#324859] text-[#FBE2A7]/50 cursor-not-allowed'
                    }`}
                >
                    Post
                </button>
            </div>
        </div>
    );
}
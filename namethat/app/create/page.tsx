/* eslint-disable @typescript-eslint/no-unused-vars */

'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Wallet, X, FileImage, FileVideo, Music } from 'lucide-react';
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
            if (!file.type.startsWith('image/')) {
                alert('Only image files are allowed.');
                (event.target as HTMLInputElement).value = '';
                return;
            }
            setUploadedFile(file);
        }
    };

    const handleRemoveFile = () => {
        setUploadedFile(null);
        // Reset the file input
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) {
            fileInput.value = '';
        }
    };

    const getFileIcon = (file: File) => {
        return <FileImage size={20} className="text-[#E4A2B1]" />;
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
        // Enforce $1 minimum based on current rate
        if (parseFloat(usdPrize) < 1) {
            alert('Minimum prize is $1 USD equivalent. Please increase the ETH amount.');
            return;
        }

        try {
            let imageUrl: string | undefined = undefined;
            if (uploadedFile) {
                const formData = new FormData();
                formData.append('file', uploadedFile);
                const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
                const uploadJson = await uploadRes.json();
                if (!uploadRes.ok) {
                    throw new Error(uploadJson.error || 'Image upload failed');
                }
                imageUrl = uploadJson.url;
            }

            const res = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    description,
                    imageUrl,
                    prizeEth: parseFloat(ethPrize),
                    creator: address,
                }),
            });
            const json = await res.json();
            if (!res.ok) {
                throw new Error(json.error || 'Failed to create post');
            }
            alert('Post created!');
            // Optionally redirect
            window.location.href = '/';
        } catch (error) {
            console.error('Failed to post:', error);
            alert((error as Error).message || 'Failed to create post. Please try again.');
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
                        placeholder="Ask the community to name your pet, product, or project"
                        className="w-full p-3 bg-[#20333D] border border-[#324859] rounded-lg text-[#F3E3EA] placeholder-[#F3E3EA]/50 focus:outline-none focus:border-[#E4A2B1] transition-colors"
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-lg font-medium mb-3">Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Add details to help the community come up with better names (e.g., personality, purpose, style)"
                        rows={4}
                        className="w-full p-3 bg-[#20333D] border border-[#324859] rounded-lg text-[#F3E3EA] placeholder-[#F3E3EA]/50 focus:outline-none focus:border-[#E4A2B1] transition-colors resize-none"
                    />
                </div>

                {/* Upload File */}
                <div>
                    <label className="block text-lg font-medium mb-3">Upload File</label>

                    {!uploadedFile ? (
                        <div className="relative">
                            <input
                                id="file-input"
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="w-20 h-20 bg-[#20333D] border border-[#324859] rounded-lg flex items-center justify-center cursor-pointer hover:border-[#E4A2B1] transition-colors">
                                <Plus size={24} className="text-[#E4A2B1]" />
                            </div>
                        </div>
                    ) : (
                        <div className="bg-[#20333D] border border-[#324859] rounded-lg p-3 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                {getFileIcon(uploadedFile)}
                                <div>
                                    <p className="text-[#F3E3EA] text-sm truncate max-w-48">{uploadedFile.name}</p>
                                    <p className="text-[#E4A2B1]/70 text-xs">{formatFileSize(uploadedFile.size)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {uploadedFile && (
                                  // Preview
                                  <img src={URL.createObjectURL(uploadedFile)} alt="preview" className="w-16 h-16 object-cover rounded-md border border-[#324859]" />
                                )}
                                <button
                                    onClick={handleRemoveFile}
                                    className="text-[#E4A2B1] hover:text-[#F3E3EA] transition-colors p-1"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Prize Pool */}
                <div>
                    <label className="block text-lg font-medium">Prize Pool</label>
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
                                    className="bg-transparent text-2xl font-medium text-[#F3E3EA] focus:outline-none"
                                    placeholder="0"
                                    style={{
                                        width: `${Math.max(ethPrize.length + 0.5,1)}ch`
                                    }}
                                />
                                <p className="text-[#FBE2A7]/70 ml-2 whitespace-nowrap">ETH</p>
                            </div>
                            <div className="flex items-center whitespace-nowrap ml-auto">
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
                    className={`w-full py-2 rounded-lg text-lg font-medium transition-colors ${
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
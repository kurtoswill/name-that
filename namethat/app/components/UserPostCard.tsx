import { useState } from 'react';
import { Eye, Crown, X, Check } from 'lucide-react';

interface NameOption {
    id: string;
    name: string;
    author: string;
    ethReward: string;
    hasVoted?: boolean;
}

interface UserPostCardProps {
    id: string;
    author: string;
    timeAgo: string;
    image: string;
    description: string;
    nameOptions: NameOption[];
    totalViews: number;
    totalVotes: number;
    totalPrize: number; // in ETH
    isWalletConnected: boolean;
    onPickWinner?: (optionId: string) => void;
}

export default function UserPostCard({
    id,
    author,
    timeAgo,
    image,
    description,
    nameOptions,
    totalViews,
    totalVotes,
    totalPrize,
    isWalletConnected,
    onPickWinner
}: UserPostCardProps) {
    const [expandedDescription, setExpandedDescription] = useState(false);
    const [showPickWinner, setShowPickWinner] = useState<string | null>(null);
    const [selectedWinner, setSelectedWinner] = useState<string | null>(null);

    // Calculate prize distribution (80% after 20% platform fee)
    const prizeAfterFees = totalPrize * 0.8;
    const prizePerVote = nameOptions.length > 0 ? prizeAfterFees / totalVotes : 0;

    const truncateText = (text: string, maxLength: number) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    const handlePickWinnerClick = (optionId: string) => {
        if (!isWalletConnected || selectedWinner) return;
        setShowPickWinner(optionId);
    };

    const confirmPickWinner = (optionId: string) => {
        if (!isWalletConnected) return;
        setSelectedWinner(optionId);
        setShowPickWinner(null);
        onPickWinner?.(optionId);
    };

    const cancelPickWinner = () => {
        setShowPickWinner(null);
    };

    return (
        <>
            <div className="bg-[#20333D] rounded-xl p-4 mb-4 border-2 border-[#FBE2A7]/50">
                {/* Header with "Your Post" indicator */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                        <div className="w-8 h-8 bg-[#E4A2B1] rounded-full flex items-center justify-center mr-3">
                            <span className="text-[#12242E] text-sm font-medium">
                                {author.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div>
                            <div className="text-[#F3E3EA] font-medium text-sm">{author}</div>
                            <div className="text-[#FBE2A7]/70 text-xs">{timeAgo}</div>
                        </div>
                    </div>
                    <div className="bg-[#FBE2A7] text-[#12242E] px-3 py-1 rounded-full text-xs font-medium">
                        Your Post
                    </div>
                </div>

                {/* Prize Info Banner */}
                <div className="bg-[#324859] rounded-lg p-3 mb-4 border border-[#FBE2A7]/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-[#FBE2A7] text-sm font-medium">
                                Total Prize Pool: {totalPrize} ETH
                            </div>
                            <div className="text-[#F3E3EA]/70 text-xs mt-1">
                                After 20% platform fee: {prizeAfterFees.toFixed(4)} ETH
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[#21B65F] text-sm font-medium">
                                ~{prizePerVote.toFixed(6)} ETH
                            </div>
                            <div className="text-[#F3E3EA]/70 text-xs">
                                per vote
                            </div>
                        </div>
                    </div>
                </div>

                {/* Image */}
                <div className="mb-4">
                    <img
                        src={image}
                        alt="Post content"
                        className="w-full h-48 object-cover rounded-lg"
                    />
                </div>

                {/* Description */}
                <div className="mb-4">
                    <p className="text-[#F3E3EA] text-sm leading-relaxed">
                        {expandedDescription ? description : truncateText(description, 120)}
                        {description.length > 120 && (
                            <button
                                onClick={() => setExpandedDescription(!expandedDescription)}
                                className="text-[#E4A2B1] ml-1 hover:text-[#F3E3EA] transition-colors"
                            >
                                {expandedDescription ? 'less' : 'more'}
                            </button>
                        )}
                    </p>
                </div>

                {/* Name Options Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="text-[#F3E3EA] font-medium">
                        Name Submissions ({nameOptions.length})
                    </div>
                    {selectedWinner ? (
                        <div className="flex items-center text-[#21B65F] text-sm">
                            <Check size={16} className="mr-1" />
                            Winner Selected
                        </div>
                    ) : (
                        <div className="text-[#FBE2A7] text-sm">
                            Pick a winner
                        </div>
                    )}
                </div>

                {/* Name Options List */}
                <div className="space-y-2 mb-4">
                    {nameOptions.map((option) => {
                        const isWinner = selectedWinner === option.id;
                        const votesForThisOption = Math.floor(Math.random() * 20) + 1; // Mock votes
                        const potentialEarning = votesForThisOption * prizePerVote;

                        return (
                            <div
                                key={option.id}
                                className={`rounded-lg p-3 flex items-center justify-between border ${isWinner
                                        ? 'bg-[#21B65F]/10 border-[#21B65F]'
                                        : 'bg-[#324859] border-[#324859]'
                                    }`}
                            >
                                <div className="flex-1">
                                    <div className="flex items-center">
                                        <div className="text-[#F3E3EA] font-medium text-sm mb-1">
                                            {option.name}
                                        </div>
                                        {isWinner && (
                                            <Crown size={16} className="ml-2 text-[#FBE2A7]" />
                                        )}
                                    </div>
                                    <div className="text-[#FBE2A7]/70 text-xs">
                                        by {option.author} • {votesForThisOption} votes • ~{potentialEarning.toFixed(6)} ETH
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    {/* Pick Winner Button */}
                                    {!selectedWinner ? (
                                        <button
                                            onClick={() => handlePickWinnerClick(option.id)}
                                            disabled={!isWalletConnected}
                                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!isWalletConnected
                                                    ? 'bg-[#324859] border border-[#324859] text-[#FBE2A7]/50 cursor-not-allowed'
                                                    : 'bg-[#FBE2A7]/20 text-[#FBE2A7] hover:bg-[#FBE2A7] border border-[#FBE2A7] hover:text-[#12242E] cursor-pointer'
                                                }`}
                                            title={!isWalletConnected ? 'Connect wallet to pick winner' : undefined}
                                        >
                                            {!isWalletConnected ? 'Connect wallet' : 'Pick Winner'}
                                        </button>
                                    ) : isWinner ? (
                                        <div className="bg-[#21B65F]/20 border border-[#21B65F] text-[#21B65F] px-3 py-1 rounded-full text-xs font-medium">
                                            Winner
                                        </div>
                                    ) : (
                                        <div className="bg-[#324859] border border-[#324859] text-[#FBE2A7]/50 px-3 py-1 rounded-full text-xs font-medium">
                                            Not Selected
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer Stats */}
                <div className="flex justify-between items-center text-xs text-[#FBE2A7]/70 pt-2 border-t border-[#324859]/30">
                    <div className="flex items-center">
                        <Eye size={14} className="mr-1" />
                        {totalViews.toLocaleString()} views
                    </div>
                    <div>
                        {totalVotes.toLocaleString()} total votes
                    </div>
                </div>
            </div>

            {/* Pick Winner Confirmation Modal */}
            {showPickWinner && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#20333D] rounded-xl p-6 max-w-sm w-full border border-[#324859]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[#F3E3EA] text-lg font-semibold">Select Winner</h3>
                            <button
                                onClick={cancelPickWinner}
                                className="text-[#FBE2A7]/70 hover:text-[#F3E3EA] transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="mb-6">
                            <p className="text-[#F3E3EA] text-sm mb-3">
                                You are about to select:{' '}
                                <span className="font-semibold text-[#FBE2A7]">
                                    {nameOptions.find(opt => opt.id === showPickWinner)?.name}
                                </span>
                                {' '}as the winner
                            </p>
                            <div className="bg-[#324859] p-3 rounded-lg">
                                <p className="text-[#FBE2A7] text-xs leading-relaxed">
                                    ⚠️ Once you select a winner, this action cannot be undone.
                                    The prize will be distributed to all voters of the winning name.
                                </p>
                            </div>
                        </div>

                        <div className="flex space-x-3">
                            <button
                                onClick={cancelPickWinner}
                                className="flex-1 bg-[#324859] text-[#F3E3EA] py-2 px-4 rounded-lg text-sm font-medium hover:bg-[#3a5366] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => confirmPickWinner(showPickWinner)}
                                className="flex-1 bg-[#FBE2A7] text-[#12242E] py-2 px-4 rounded-lg text-sm font-medium hover:bg-[#f5d77a] transition-colors"
                            >
                                Select Winner
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
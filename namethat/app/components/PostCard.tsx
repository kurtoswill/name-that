import { useState } from 'react';
import { Plus, Eye, X } from 'lucide-react';
import userSvg from '/public/user.svg';
import Image from 'next/image';

interface NameOption {
    id: string;
    name: string;
    author: string;
    ethReward: string;
    hasVoted?: boolean;
    voteCount: string;
}

interface PostCardProps {
    id: string;
    author: string;
    timeAgo: string;
    image: string;
    description: string;
    nameOptions: NameOption[];
    totalViews: number;
    totalVotes: number;
    totalPrize?: number; // in ETH
    isWalletConnected: boolean;
    onAddName?: (newName: string) => void;
    onVote?: (optionId: string) => void;
}

export default function PostCard({
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
    onAddName,
    onVote
}: PostCardProps) {
    const [expandedDescription, setExpandedDescription] = useState(false);
    const [votedOptions, setVotedOptions] = useState<Set<string>>(new Set());
    const [showVoteConfirm, setShowVoteConfirm] = useState<string | null>(null);
    const [showAddName, setShowAddName] = useState(false);
    const [newNameInput, setNewNameInput] = useState('');

    const truncateText = (text: string, maxLength: number) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    const handleVoteClick = (optionId: string) => {
        if (!isWalletConnected || votedOptions.has(optionId)) return;
        setShowVoteConfirm(optionId);
    };

    const confirmVote = (optionId: string) => {
        if (!isWalletConnected) return;
        setVotedOptions(prev => new Set(prev).add(optionId));
        setShowVoteConfirm(null);
        onVote?.(optionId);
    };

    const cancelVote = () => {
        setShowVoteConfirm(null);
    };

    const handleAddNameClick = () => {
        if (!isWalletConnected || nameOptions.length >= 5) return;
        setShowAddName(true);
    };

    const handleAddNameSubmit = () => {
        if (!isWalletConnected || !newNameInput.trim()) return;

        onAddName?.(newNameInput.trim());
        setNewNameInput('');
        setShowAddName(false);
    };

    const cancelAddName = () => {
        setNewNameInput('');
        setShowAddName(false);
    };

    return (
        <>
            <div className="bg-[#20333D]/80 backdrop-blur-sm rounded-xl border border-[#324859]/50 overflow-hidden">
                {/* User Info - Upper Left */}
                <div className="p-4 pb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 border-2 border-[#FBE2A7] rounded-full flex items-center justify-center">
                            <Image src={userSvg} alt="User" className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-white font-medium text-sm">{author}</div>
                            <div className="text-white/60 text-xs">{timeAgo}</div>
                        </div>
                    </div>
                </div>

                {/* Character Image - Rectangular */}
                <div className="px-4 pb-6">
                    <div className="relative h-64 bg-[#20333D] rounded-lg overflow-hidden">
                        {/* Image placeholder - no border, just the container */}
                    </div>
                </div>

                {/* Description */}
                <div className="px-4 pb-4">
                    <p className="text-white/80 text-sm leading-relaxed">
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

                {/* Name Options */}
                <div className="px-4 pb-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[#E4A2B1] font-medium">Name Options ({nameOptions.length})</h3>
                        <button
                            onClick={handleAddNameClick}
                            disabled={!isWalletConnected || nameOptions.length >= 5}
                            className={`border border-[#E4A2B1] text-[#E4A2B1] px-3 py-1 rounded-lg text-sm font-medium transition-colors hover:bg-[#E4A2B1]/10 flex items-center gap-2 ${!isWalletConnected || nameOptions.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                        >
                            <Plus size={16} />
                            Add name
                        </button>
                    </div>

                    <div className="space-y-2">
                        {nameOptions.map((option) => {
                            const hasVoted = votedOptions.has(option.id);
                            return (
                                <div key={option.id} className="flex items-center justify-between bg-[#324859]/30 rounded-lg p-3">
                                    <div>
                                        <div className="text-white font-medium">{option.name}</div>
                                        <div className="text-white/60 text-xs">by {option.author}</div>
                                    </div>
                                    <button
                                        onClick={() => handleVoteClick(option.id)}
                                        disabled={!isWalletConnected || hasVoted}
                                        className={`px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-2 ${hasVoted
                                                ? 'bg-[#21B65F] text-white'
                                                : 'bg-[#FBE2A7] text-[#12242E]'
                                            } ${!isWalletConnected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                        <span>{hasVoted ? '✓' : <Plus size={14} />}</span>
                                        <span>{option.voteCount}</span>
                                        <span>{hasVoted ? 'Voted' : option.ethReward}</span>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Stats */}
                <div className="px-4 py-3 bg-[#324859]/20 border-t border-[#324859]/30 flex justify-between text-white/70 text-sm">
                    <div className="flex items-center gap-2">
                        <Eye size={14} />
                        <span>{totalViews.toLocaleString()} views</span>
                    </div>
                    <span>{totalVotes.toLocaleString()} total votes</span>
                </div>
            </div>

            {/* Add Name Modal */}
            {showAddName && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#20333D] rounded-xl p-6 max-w-sm w-full border border-[#324859]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[#F3E3EA] text-lg font-semibold">Add Name Suggestion</h3>
                            <button
                                onClick={cancelAddName}
                                className="text-[#FBE2A7]/70 hover:text-[#F3E3EA] transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="mb-6">
                            <label className="block text-[#F3E3EA] text-sm font-medium mb-2">
                                Your name suggestion
                            </label>
                            <input
                                type="text"
                                value={newNameInput}
                                onChange={(e) => setNewNameInput(e.target.value)}
                                placeholder="Enter a creative name..."
                                className="w-full bg-[#324859] border border-[#324859] rounded-lg px-3 py-2 text-[#F3E3EA] text-sm placeholder-[#FBE2A7]/50 focus:outline-none focus:ring-2 focus:ring-[#E4A2B1] focus:border-transparent"
                                maxLength={50}
                            />
                            <div className="mt-2 text-xs text-[#FBE2A7]/70">
                                {newNameInput.length}/50 characters
                            </div>

                            <div className="bg-[#324859] p-3 rounded-lg mt-4">
                                <p className="text-[#FBE2A7] text-xs leading-relaxed">
                                    💡 Your name suggestion will be added to this post for others to vote on.
                                    Make it creative and relevant!
                                </p>
                            </div>
                        </div>

                        <div className="flex space-x-3">
                            <button
                                onClick={cancelAddName}
                                className="flex-1 bg-[#324859] text-[#F3E3EA] py-2 px-4 rounded-lg text-sm font-medium hover:bg-[#3a5366] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddNameSubmit}
                                disabled={!newNameInput.trim()}
                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${!newNameInput.trim()
                                        ? 'bg-[#324859] text-[#FBE2A7]/50 cursor-not-allowed'
                                        : 'bg-[#E4A2B1] text-[#12242E] hover:bg-[#e29cad]'
                                    }`}
                            >
                                Add Name
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Vote Confirmation Modal */}
            {showVoteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#20333D] rounded-xl p-6 max-w-sm w-full border border-[#324859]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[#F3E3EA] text-lg font-semibold">Confirm Vote</h3>
                            <button
                                onClick={cancelVote}
                                className="text-[#FBE2A7]/70 hover:text-[#F3E3EA] transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="mb-6">
                            <p className="text-[#F3E3EA] text-sm mb-3">
                                You are about to vote for:{' '}
                                <span className="font-semibold text-[#E4A2B1]">
                                    {nameOptions.find(opt => opt.id === showVoteConfirm)?.name}
                                </span>
                            </p>
                            <div className="bg-[#324859] p-3 rounded-lg">
                                <p className="text-[#FBE2A7] text-xs leading-relaxed">
                                    ⚠️ Once you vote, you cannot change or remove your vote.
                                    This action is permanent and will cost 0.0001 ETH.
                                </p>
                            </div>
                        </div>

                        <div className="flex space-x-3">
                            <button
                                onClick={cancelVote}
                                className="flex-1 bg-[#324859] text-[#F3E3EA] py-2 px-4 rounded-lg text-sm font-medium hover:bg-[#3a5366] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => confirmVote(showVoteConfirm)}
                                className="flex-1 bg-[#E4A2B1] text-[#12242E] py-2 px-4 rounded-lg text-sm font-medium hover:bg-[#e29cad] transition-colors"
                            >
                                Confirm Vote
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
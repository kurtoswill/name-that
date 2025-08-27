import { useState } from 'react';
import { Plus, Eye, X } from 'lucide-react';

interface NameOption {
    id: string;
    name: string;
    author: string;
    ethReward: string;
    hasVoted?: boolean;
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

    // Calculate prize distribution (80% after 20% platform fee)
    const prizeAfterFees = totalPrize ? totalPrize * 0.8 : 0;
    const prizePerVote = totalPrize && totalVotes > 0 ? prizeAfterFees / totalVotes : 0;

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
            <div className="bg-[#20333D] rounded-xl p-4 mb-4 border border-[#324859]/50">
                {/* Header */}
                <div className="flex items-center mb-3">
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

                {/* Prize Info Banner - only show if totalPrize exists */}
                {totalPrize && (
                    <div className="bg-[#324859] rounded-lg p-3 mb-4 border border-[#21B65F]/30">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-[#21B65F] text-sm font-medium">
                                    Prize Pool: {totalPrize} ETH
                                </div>
                                <div className="text-[#F3E3EA]/70 text-xs mt-1">
                                    After 20% fee: {prizeAfterFees.toFixed(4)} ETH
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[#FBE2A7] text-sm font-medium">
                                    ~{prizePerVote.toFixed(6)} ETH
                                </div>
                                <div className="text-[#F3E3EA]/70 text-xs">
                                    per vote
                                </div>
                            </div>
                        </div>
                    </div>
                )}

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
                        Name Options ({nameOptions.length}/5)
                    </div>
                    <button
                        onClick={handleAddNameClick}
                        disabled={!isWalletConnected || nameOptions.length >= 5}
                        className={`flex items-center text-sm transition-colors ${
                            !isWalletConnected
                                ? 'text-[#FBE2A7]/30 cursor-not-allowed'
                                : nameOptions.length >= 5
                                    ? 'text-[#FBE2A7]/50 cursor-not-allowed'
                                    : 'text-[#E4A2B1] hover:text-[#F3E3EA] cursor-pointer'
                        }`}
                        title={!isWalletConnected ? 'Connect wallet to add names' : undefined}
                    >
                        <Plus size={16} className="mr-1" />
                        {!isWalletConnected
                            ? 'Connect wallet'
                            : nameOptions.length >= 5
                                ? 'Limit reached'
                                : 'Add name'
                        }
                    </button>
                </div>

                {/* Name Options List */}
                <div className="space-y-2 mb-4">
                    {nameOptions.map((option) => {
                        const hasVoted = votedOptions.has(option.id);
                        return (
                            <div
                                key={option.id}
                                className="bg-[#324859] rounded-lg p-3 flex items-center justify-between"
                            >
                                <div className="flex-1">
                                    <div className="text-[#F3E3EA] font-medium text-sm mb-1">
                                        {option.name}
                                    </div>
                                    <div className="text-[#FBE2A7]/70 text-xs">
                                        by {option.author}
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    {/* ETH Reward */}
                                    <div className="bg-[#21B65F]/20 border border-[#21B65F] text-[#21B65F] px-2 py-1 rounded-full text-xs font-medium">
                                        0.0001 ETH
                                    </div>

                                    {/* Vote Button */}
                                    <button
                                        onClick={() => handleVoteClick(option.id)}
                                        disabled={!isWalletConnected || hasVoted}
                                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                            !isWalletConnected
                                                ? 'bg-[#324859] border border-[#324859] text-[#FBE2A7]/50 cursor-not-allowed'
                                                : hasVoted
                                                    ? 'bg-[#FBE2A7]/20 border border-[#FBE2A7] text-[#FBE2A7] cursor-not-allowed'
                                                    : 'bg-[#E4A2B1]/20 text-[#E4A2B1] hover:bg-[#E4A2B1] border border-[#E4A2B1] hover:text-[#12242E] cursor-pointer'
                                        }`}
                                        title={!isWalletConnected ? 'Connect wallet to vote' : undefined}
                                    >
                                        {!isWalletConnected ? 'Connect wallet' : hasVoted ? 'Voted' : 'Vote'}
                                    </button>
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
                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                                    !newNameInput.trim()
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
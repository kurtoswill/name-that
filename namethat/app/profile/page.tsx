"use client";

import React, { useState } from "react";
import { Trophy, Medal, Award } from "lucide-react";

const ProfilePage = () => {
    const [activeTab, setActiveTab] = useState("Leaderboards");

    const leaderboardData = [
        { id: 1, rank: 1, name: "Emilia", username: "kzlrwnjne", timeAgo: "3d ago", votes: "25k" },
        { id: 2, rank: 2, name: "Frieren", username: "kzlrwnjne", timeAgo: "4d ago", votes: "19k" },
        { id: 3, rank: 3, name: "Gojo Satorou", username: "kzlrwnjne", timeAgo: "5d ago", votes: "15k" },
    ];

    const getRankStyle = (rank: number) => {
        switch (rank) {
            case 1:
                return "bg-yellow-400 text-black border-yellow-300"; // Gold
            case 2:
                return "bg-gray-300 text-black border-gray-400"; // Silver
            case 3:
                return "bg-amber-600 text-white border-amber-700"; // Bronze
            default:
                return "bg-[#324859]/40 text-[#F3E3EA] border-[#324859]/60";
        }
    };

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1:
                return <Trophy className="w-5 h-5 text-black" />;
            case 2:
                return <Medal className="w-5 h-5 text-black" />;
            case 3:
                return <Award className="w-5 h-5 text-white" />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-[#12242E] text-[#F3E3EA] p-4">
            {/* Profile Card */}
            <div className="bg-[#20333D] rounded-xl p-6 max-w-md mx-auto mb-6 text-center border border-[#324859]">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#F3E3EA] to-[#E4A2B1] flex items-center justify-center text-[#12242E] font-semibold text-2xl">
                    K
                </div>
                <h2 className="mt-4 font-semibold text-lg">Kazel Tuazon</h2>
                <p className="text-[#F3E3EA]/70 text-sm">kzlrwnjne</p>
                <p className="mt-3 text-sm text-[#F3E3EA]/80">
                    🌟 Photographer & NFT creator | Building on Base | Seeking creative alpha from the FC community
                </p>
            </div>

            {/* Tabs */}
            <div className="flex bg-[#20333D] rounded-lg p-1 mb-6 max-w-sm mx-auto border border-[#324859]">
                {["Post", "Leaderboards"].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            activeTab === tab
                                ? "bg-[#24272B] text-[#E4A2B1]"
                                : "text-[#E4A2B1]/60 hover:text-[#E4A2B1]"
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Leaderboard Tab */}
            {activeTab === "Leaderboards" && (
                <div className="max-w-md mx-auto space-y-3">
                    {leaderboardData.map((user) => (
                        <div
                            key={user.id}
                            className="bg-[#20333D]/80 backdrop-blur-sm rounded-xl p-4 border border-[#324859]"
                        >
                            <div className="flex items-center justify-between">
                                {/* Left Side */}
                                <div className="flex items-center space-x-4">
                                    {/* Rank Badge */}
                                    <div
                                        className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm font-bold ${getRankStyle(
                                            user.rank
                                        )}`}
                                    >
                                        {user.rank <= 3 ? getRankIcon(user.rank) : user.rank}
                                    </div>

                                    {/* Image posted */}
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#F3E3EA] to-[#E4A2B1] flex items-center justify-center text-[#12242E] font-semibold">
                                        {user.name.charAt(0)}
                                    </div>

                                    {/* User Info */}
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-sm">{user.name}</h3>
                                        <p className="text-[#F3E3EA]/70 text-xs">
                                            by {user.username} • {user.timeAgo}
                                        </p>
                                    </div>
                                </div>

                                {/* Votes Badge */}
                                <div className="flex items-center bg-[#21B65F]/20 px-3 py-1 rounded-full space-x-2 border border-[#21B65F]">
                                  <span className="text-xs flex items-center gap-1">
                                    <p className="text-[#21B65F]">{user.votes}</p>
                                    <p className="text-[#FBE2A7]">Voted</p>
                                  </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ProfilePage;

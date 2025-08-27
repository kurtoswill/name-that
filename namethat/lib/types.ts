export type Address = `0x${string}`;

export interface Post {
  id: string;
  creator: Address;
  title: string;
  description: string;
  imageUrl?: string;
  createdAt: number; // epoch ms
  prizeEth: number; // total ETH funded
  usdAtCreation: number; // USD value of prize at creation
  winnerSuggestionId?: string;
  deleted?: boolean;
}

export interface Suggestion {
  id: string;
  postId: string;
  author: Address;
  text: string;
  createdAt: number;
}

export interface Vote {
  id: string;
  postId: string;
  suggestionId: string;
  voter: Address;
  createdAt: number;
}

export interface LeaderboardEntry {
  postId: string;
  totalVotes: number;
  trendingScore: number;
}

# NameThat Backend Setup TODO

This repository currently includes a working frontend and a prototype backend with in-memory storage and serverless API routes. To make it production-ready, follow these setup steps.


Implemented by Junie (this session):
- Added Prisma client setup (lib/prisma.ts) and wired API routes to Prisma for Posts, Suggestions, Votes, Winner, Leaderboard, Delete Post, and Notifications scan.✓
- Implemented Cloudinary upload route with strict image-only validation and client-side single-file preview/remove on Create page.✓
- Enforced $1 USD minimum prize using CoinGecko on server and client.✓
- Added Upstash Redis helper and scheduled notifications API to enqueue reminders for posts older than 24h without a winner.✓
- Basic server-side validations (string lengths, URL, wallet address format).✓
- Maintained TODO with free-tier focused guidance.✓

Manual steps for you:
- Provision a database (Neon Postgres free tier recommended) and set DATABASE_URL. Or use Prisma Postgres (local) for dev and Neon in prod.
- Run Prisma migrations (see steps below) to create tables.
- Configure Cloudinary or UploadThing credentials in .env.
- Configure Upstash Redis and set REDIS_URL/REDIS_TOKEN.
- Deploy contracts to Base and add addresses/ABIs, then wire escrow/distribution logic in API.
- Add a scheduled job (Vercel Cron or Upstash QStash) to call /api/notifications/run hourly.
- Update frontend feed/profile pages to consume live APIs (see notes below). 

## 1. Database Schema (Posts, Suggestions, Votes, Users)
Persistent database is required (Neon Postgres free tier, or Prisma + SQLite for local dev). Current Prisma schema models include:

- User
  - id (string, wallet address, primary key)
  - username, profile metadata (optional)

- Post
  - id (string, primary key)
  - creator (string, wallet address)
  - title (string)
  - description (string)
  - imageUrl (string, nullable)
  - createdAt (datetime)
  - prizeEth (numeric)
  - usdAtCreation (numeric)
  - winnerSuggestionId (string, nullable)
  - deleted (boolean, default false)

- Suggestion
  - id (string, primary key)
  - postId (string, FK -> Post)
  - author (string, wallet address)
  - text (string)
  - createdAt (datetime)

- Vote
  - id (string, primary key)
  - postId (string, FK -> Post)
  - suggestionId (string, FK -> Suggestion)
  - voter (string, wallet address)
  - createdAt (datetime)
  - Unique(voter, postId) to enforce 1 vote per voter per post (immutability)

Update the API route handlers in `app/api/*` to use the DB instead of `lib/store.ts`.

## 2. Image Storage (Cloudinary or UploadThing)
This repo includes `/api/upload` which uploads to Cloudinary and enforces image-only validation.

- Create a Cloudinary account (free tier).
- Create an unsigned upload preset (recommended) OR use API key/secret for signed uploads.
- Add env vars in `.env` (or Vercel project settings):
  - CLOUDINARY_CLOUD_NAME
  - CLOUDINARY_UPLOAD_PRESET (if using unsigned uploads)
  - CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET (if using signed uploads)
- Frontend Create page already sends image to `/api/upload` and previews/removes before submit.

Alternatively, replace with UploadThing and port the `/api/upload` route accordingly. Ensure only MIME types starting with `image/` are accepted on both client and server.

## 3. ETH-USD Conversion API
- The create post route `/api/posts` validates a minimum prize of $1 USD using CoinGecko public API.
- For production, add a fallback provider (e.g., Coinbase price API) and caching.
- Consider server-side revalidation of rates and handling rate-limits.

## 4. Smart Contracts (Base / Farcaster context)
Implement and deploy the smart contracts that:
- Accept and escrow the post prize pool funding.
- Distribute rewards when the post creator selects a winner:
  - Winner receives 50% of prize.
  - Voters of the winning suggestion receive 30% prorated (or as per finalized logic).
  - Platform fee 20% retained by the app.
- Enforce: a post can be deleted by creator only after a winner is selected.
- Ensure voting is immutable on-chain if required, or reconcile off-chain votes with on-chain finalization.

Recommended stack: Foundry/Hardhat + Viem/Ethers in the app. Add contract addresses and ABIs to the repo, and wire calls in API handlers (create post for escrow, select winner for distribution). Add these env vars:
- NEXT_PUBLIC_CHAIN_ID (e.g., Base)
- CONTRACT_ADDRESS
- RPC_URL (Base RPC)
- WALLET_PRIVATE_KEY (server signer for actions, if needed)

## 5. Redis Notifications
- This repo includes `lib/redis.ts` that initializes Upstash Redis if `REDIS_URL` and `REDIS_TOKEN` are set.
- Implement a scheduled job (Vercel cron or Upstash QStash) that runs every hour/day and:
  - Finds posts older than 24 hours without `winnerSuggestionId`.
  - Pushes a notification to the creator via Redis (list, pub/sub, or a notification service).
- Add to `.env`:
  - REDIS_URL
  - REDIS_TOKEN

## 6. Leaderboard
- The `/api/leaderboard` endpoint supports:
  - All Time: Sort by total vote count per post (sum across suggestions).
  - Trending: A recency-weighted score using vote timestamps.
- Replace in-memory calculations with efficient DB queries.

## 7. API Endpoints Implemented (Prototype)
- POST /api/upload: image-only upload to Cloudinary.
- POST /api/posts: validates title/description, min $1 prize, creates post.
- GET /api/posts: lists posts.
- POST /api/suggestions: adds a suggestion to a post.
- GET /api/suggestions?postId=...: lists suggestions.
- POST /api/votes: immutable voting (one vote per voter per post).
- GET /api/votes?postId=...: lists votes.
- POST /api/winner: only creator can select winner; placeholder for on-chain distribution.
- GET /api/leaderboard?mode=all|trending

## 8. Frontend Wiring
- Create page now:
  - Enforces image-only selection and single file.
  - Previews and allows removal before posting.
  - Uploads to /api/upload then submits to /api/posts.
  - Validates $1 USD minimum on client; server re-validates.
- Feed/Profile currently mock. Update to call the APIs and render live data. Implement add-name and vote actions using `/api/suggestions` and `/api/votes`.

## 9. Environment Variables
Add the following to `.env` or your deployment platform:
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_UPLOAD_PRESET (or CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET)
- REDIS_URL
- REDIS_TOKEN
- CONTRACT_ADDRESS, RPC_URL, NEXT_PUBLIC_CHAIN_ID, WALLET_PRIVATE_KEY (when contracts are added)

## 10. Security & Validation
- Double-check server-side validations (string lengths, content sanitization).
- Enforce size limits on uploads (Cloudinary preset can enforce).
- Rate-limit API endpoints if needed.

## 11. Deployment Steps
- Deploy smart contracts to Base.
- Add contract address/ABI to the app and wire escrow/distribution calls.
- Configure Redis (Upstash) and a cron (Vercel) or QStash scheduled job for reminders.
- Configure Cloudinary credentials and upload preset.
- Migrate DB and configure connection string.
- Deploy the Next.js app (e.g., Vercel) with the required env vars.

## 12. Prisma Migration Commands
- Install deps: npm install
- Generate client: npx prisma generate
- Create DB schema (dev): npx prisma migrate dev --name init
- Inspect data: npx prisma studio
- For Neon Postgres, set DATABASE_URL to your Neon connection string before running migrations.

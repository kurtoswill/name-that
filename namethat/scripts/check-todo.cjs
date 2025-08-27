// Simple check to ensure TODO.md includes completed items by Junie
// Exits with non-zero code if checks fail.

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const todoPath = path.join(root, 'TODO.md');

function fail(msg) {
  console.error(`[check-todo] ❌ ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`[check-todo] ✅ ${msg}`);
}

if (!fs.existsSync(todoPath)) {
  fail('TODO.md not found at repository root.');
}

const content = fs.readFileSync(todoPath, 'utf8');

// Ensure section header exists
const header = 'Implemented by Junie (this session):';
if (!content.includes(header)) {
  fail('Section "Implemented by Junie (this session):" not found in TODO.md');
}

// Expected bullet points to verify presence of completed tasks.
// Keep these in sync with the tasks we actually implemented.
const expectedBullets = [
  'Added Prisma client setup (lib/prisma.ts) and wired API routes to Prisma for Posts, Suggestions, Votes, Winner, Leaderboard, Delete Post, and Notifications scan.✓',
  'Implemented Cloudinary upload route with strict image-only validation and client-side single-file preview/remove on Create page.✓',
  'Enforced $1 USD minimum prize using CoinGecko on server and client.✓',
  'Added Upstash Redis helper and scheduled notifications API to enqueue reminders for posts older than 24h without a winner.✓',
  'Basic server-side validations (string lengths, URL, wallet address format).✓',
  'Maintained TODO with free-tier focused guidance.✓',
];

for (const bullet of expectedBullets) {
  if (!content.includes(bullet)) {
    fail(`Missing expected completed item in TODO.md: ${bullet}`);
  }
}

ok('All expected completed TODO items are present.');

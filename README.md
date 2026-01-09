# PhantomPay

**Offline-First Payment Tracker with AI Voice Assistant | Build2Break Hackathon 2026**

> Your payments are protected by our offline-sync technology. Even if everything goes down, PhantomPay saves every transaction. Now with AI-powered voice commands!

## What's New: AI Voice Assistant

**Conversational AI** - Multi-turn conversations with natural language understanding  
**Smart Intent Recognition** - Correctly identifies payment vs receive commands  
**Voice Feedback** - Speaks responses using text-to-speech  
**Query Support** - Ask for balance, transactions, and more  
**Multiple Formats** - Understands "2k", "2 lakh", "two thousand" and more  

**Try it:**
- "Pay 500 for lunch"
- "Received 2000 from client"
- "What's my balance?"
- "Show last transaction"

---

## The Problem

In regions with unstable internet, users often cannot complete payments or forget to record expenses when the network is down. This leads to:
- Lost transaction records
- Chaos in personal finances
- Failed business operations

## Our Solution: The Shadow Ledger

ctrlshiftalt uses a **Local-First** approach: the app is always available. Even if the server goes down, your data is safe on your device.

### Key Concepts:
- **Shadow Balance**: The real-time effective balance calculated locally
- **Cached Balance**: Last known balance from the server
- **Offline Transactions**: Signed, timestamped records stored locally until sync
- **AI Voice Assistant**: Conversational interface for hands-free transaction management

---

## Quick Start

### Prerequisites
- Node.js 20+ recommended (18+ works)
- npm or yarn
- Supabase account (free tier works)

### 1) Clone & Install

```bash
git clone https://github.com/Destroyer795/ctrlshiftalt.git
cd ctrlshiftalt
npm install
```

### 2) Configure Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Apply all three migrations **in order** via the SQL Editor:
  - `supabase/migrations/001_initial_schema.sql` (core schema, RLS, RPC base)
  - `supabase/migrations/002_p2p_transfers.sql` (adds P2P recipient support and updates RPC)
  - `supabase/migrations/003_custom_initial_balance.sql` (supports custom starting balance on signup)
  - `supabase/migrations/004_lookup_recipient.sql` (converts recipient email to user ID)
3. Create `.env.local` and fill your credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SIGNING_SALT=your-random-salt
```

### 3) Run Development Server

```bash
npm run dev
```

Open http://localhost:3000 (login is at `/`, dashboard at `/dashboard`).

---

## Docker Deployment

### Recommended: Docker Compose (one step build + run)

Create an env file (e.g., `.env.local` or `.env`) with:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SIGNING_SALT=your-random-salt
```

Then run (adds `--build` so images rebuild when needed):

```bash
docker compose --env-file .env.local up --build
```



### Troubleshooting

If you encounter build errors (e.g., `Cannot find module lightningcss`), it is likely due to platform-specific dependencies or stale Docker cache.

**Fix:** Clean existing artifacts and rebuild:

```powershell
docker compose down
docker system prune -f
docker compose --env-file .env.local up --build
```

**Note:** The build process is configured to ignore your local `package-lock.json` to ensure the correct Linux binaries are fetched. This might make the initial build slightly longer but guarantees compatibility.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER DEVICE                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │   React UI  │───▶│   Hooks     │───▶│  Dexie.js (IndexedDB)│ │
│  │             │    │  - Shadow   │    │  - transactions     │  │
│  │  - Balance  │    │  - Online   │    │  - wallet           │  │
│  │  - List     │    │  - Sync     │    │                     │  │
│  └─────────────┘    └─────────────┘    └──────────┬──────────┘  │
│                                                    │            │
│                           ┌────────────────────────┘            │
│                           ▼                                     │
│                    ┌─────────────┐                              │
│                    │ Sync Engine │                              │
│                    │             │                              │
│                    │ - Batch     │                              │
│                    │ - Retry     │                              │
│                    │ - Sign      │                              │
│                    └──────┬──────┘                              │
└───────────────────────────┼─────────────────────────────────────┘
                            │ (When Online)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SUPABASE CLOUD                            │
│  ┌─────────────────┐    ┌──────────────────────────────────────┐│
│  │   Auth          │    │         PostgreSQL                   ││
│  │                 │    │  ┌─────────────┐  ┌───────────────┐  ││
│  │  - Email/Pass   │    │  │  profiles   │  │ transactions  │  ││
│  │  - OAuth        │    │  │  - balance  │  │ - offline_id  │  ││
│  └─────────────────┘    │  └─────────────┘  │ - signature   │  ││
│                         │                   └───────────────┘  ││
│                         │  ┌────────────────────────────────┐  ││
│                         │  │    process_offline_batch()     │  ││
│                         │  │    - Idempotency check         │  ││
│                         │  │    - Signature verify          │  ││
│                         │  │    - Balance validation        │  ││
│                         │  └────────────────────────────────┘  ││
│                         └──────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Features

### 1. Idempotency (Replay Attack Prevention)
Every offline transaction gets a unique `offline_id` (UUID v4). The server rejects duplicate IDs.

### 2. Cryptographic Signing
Each transaction is signed: `SHA256(userId + offlineId + amount + timestamp + salt)`.

### 3. Row Level Security (RLS)
PostgreSQL policies ensure users can only access their own data.

### 4. Balance Validation
Server-side check prevents overdraft even if client is compromised.

---

## Tech Stack

- **Frontend**: Next.js, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Offline DB**: Dexie.js (IndexedDB)
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Crypto**: Web Crypto API (SHA-256)
- **Icons**: Lucide React
- **Charts**: Chart.js, react-chartjs-2

---

## License

MIT License - Build2Break Hackathon 2026

---

# PhantomPay

**Offline-First Payment Tracker | Build2Break Hackathon 2026**

> Your payments are protected by our offline-sync technology. Even if everything goes down, PhantomPay saves every transaction.

## The Problem

In regions with unstable internet, users often cannot complete payments or forget to record expenses when the network is down. This leads to:
- Lost transaction records
- Chaos in personal finances
- Failed business operations

## Our Solution: The Shadow Ledger

PhantomPay uses a **Local-First** approach: the app is always available. Even if the server goes down, your data is safe on your device.

### Key Concepts:
- **Shadow Balance**: The real-time effective balance calculated locally
- **Cached Balance**: Last known balance from the server
- **Offline Transactions**: Signed, timestamped records stored locally until sync

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (free tier works)

### 1. Clone & Install

```bash
git clone <https://github.com/Destroyer795/PhantomPay.git>
cd phantom-pay
npm install
```

### 2. Configure Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the SQL migration:
   - Go to SQL Editor
   - Copy contents of `supabase/migrations/001_initial_schema.sql`
   - Execute

3. Create `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SIGNING_SALT=your-random-salt
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Docker Deployment

### Build & Run

```bash
# Build the image
docker build -t phantmpay .

# Run with environment variables
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your_url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key \
  phantmpay
```

### Using Docker Compose

```bash
# Create .env file with your credentials
docker-compose up --build
```

---

## Security Features

### 1. Idempotency (Replay Attack Prevention)
Every offline transaction gets a unique `offline_id` (UUID v4). The server rejects duplicate IDs.

### 2. Cryptographic Signing
Each transaction is signed: `SHA256(userId + offlineId + amount + timestamp + salt)`

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

## 📝 License

MIT License - Build2Break Hackathon 2026

---


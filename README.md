# 🛡️ ResilientPay

**Offline-First Payment Tracker | Build2Break Hackathon 2024**

> Your payments are protected by our offline-sync technology. Even if everything goes down, ResilientPay saves every transaction.

## 🎯 The Problem

In regions with unstable internet, users often cannot complete payments or forget to record expenses when the network is down. This leads to:
- Lost transaction records
- Chaos in personal finances
- Failed business operations

## 💡 Our Solution: The Shadow Ledger

ResilientPay uses a **Local-First** approach: the app is always available. Even if the server goes down, your data is safe on your device.

### Key Concepts:
- **Shadow Balance**: The real-time effective balance calculated locally
- **Cached Balance**: Last known balance from the server
- **Offline Transactions**: Signed, timestamped records stored locally until sync

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (free tier works)

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd resilient-pay
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

## 🐳 Docker Deployment

### Build & Run

```bash
# Build the image
docker build -t resilientpay .

# Run with environment variables
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your_url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key \
  resilientpay
```

### Using Docker Compose

```bash
# Create .env file with your credentials
docker-compose up --build
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER DEVICE                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │   React UI  │───▶│   Hooks     │───▶│  Dexie.js (IndexedDB)│ │
│  │             │    │  - Shadow   │    │  - transactions     │  │
│  │  - Balance  │    │  - Zudu AI  │    │  - wallet           │  │
│  │  - List     │    │  - Online   │    │                     │  │
│  └─────────────┘    └─────────────┘    └──────────┬──────────┘  │
│                                                    │             │
│                           ┌────────────────────────┘             │
│                           ▼                                      │
│                    ┌─────────────┐                               │
│                    │ Sync Engine │                               │
│                    │             │                               │
│                    │ - Batch     │                               │
│                    │ - Retry     │                               │
│                    │ - Sign      │                               │
│                    └──────┬──────┘                               │
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
│                         │                    └───────────────┘  ││
│                         │  ┌────────────────────────────────┐   ││
│                         │  │    process_offline_batch()     │   ││
│                         │  │    - Idempotency check         │   ││
│                         │  │    - Signature verify          │   ││
│                         │  │    - Balance validation        │   ││
│                         │  └────────────────────────────────┘   ││
│                         └──────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Features

### 1. Idempotency (Replay Attack Prevention)
Every offline transaction gets a unique `offline_id` (UUID v4). The server rejects duplicate IDs.

### 2. Cryptographic Signing
Each transaction is signed: `SHA256(userId + offlineId + amount + timestamp + salt)`

### 3. Row Level Security (RLS)
PostgreSQL policies ensure users can only access their own data.

### 4. Balance Validation
Server-side check prevents overdraft even if client is compromised.

---

## 📁 Project Structure

```
resilient-pay/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Dashboard
│   │   └── globals.css      # Global styles
│   │
│   ├── components/          # React components
│   │   ├── BalanceCard.tsx
│   │   ├── PaymentForm.tsx
│   │   ├── TransactionList.tsx
│   │   └── NetworkStatus.tsx
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── useShadowTransaction.ts  # Core offline logic
│   │   ├── useOnlineStatus.ts       # Network detection
│   │   └── useZuduAgent.ts          # Voice input
│   │
│   ├── lib/                 # Core libraries
│   │   ├── db.ts            # Dexie.js schema
│   │   ├── supabase.ts      # Supabase client
│   │   ├── syncEngine.ts    # Sync logic
│   │   └── types.ts         # TypeScript types
│   │
│   └── utils/               # Utilities
│       └── crypto.ts        # Signing functions
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
│
├── public/
│   └── manifest.json        # PWA manifest
│
├── Dockerfile
├── docker-compose.yml
└── package.json
```

---

## 👥 Team Responsibilities

| Member | Role | Focus |
|--------|------|-------|
| **A** | Backend & DevOps | Supabase, Docker, Security |
| **B** | Core Logic | Dexie.js, Sync Engine, Hooks |
| **C** | Frontend | UI/UX, Components, QR |
| **D** | AI & PWA | Zudu Voice, Service Workers |

---

## 🧪 Break Phase Defense

### Test 1: Offline Persistence
1. Turn off WiFi
2. Add 5 transactions
3. Reload page
4. ✅ Transactions should persist

### Test 2: Replay Attack
1. Add transaction online
2. Capture sync request (DevTools)
3. Replay via Postman
4. ✅ Server should reject duplicate `offline_id`

### Test 3: Negative Balance
1. Go offline
2. Try spending more than shadow balance
3. ✅ UI should block transaction

### Test 4: Tampered Request
1. Intercept sync request
2. Modify amount
3. ✅ Server should reject (signature mismatch)

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS 4, Framer Motion
- **Offline DB**: Dexie.js (IndexedDB)
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Crypto**: Web Crypto API (SHA-256)
- **Icons**: Lucide React
- **Charts**: Chart.js, react-chartjs-2

---

## 📝 License

MIT License - Build2Break Hackathon 2024

---

**Built with ❤️ for resilience**

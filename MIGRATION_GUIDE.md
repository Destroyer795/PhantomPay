# Database Migration: Custom Initial Balance

## Overview
This migration adds support for users to set a custom initial balance during sign-up. Previously, all users started with a fixed balance of Rs 10,000.

## What Changed

### 1. Sign-Up Form (`src/app/page.tsx`)
- Added an "Initial Balance" input field that appears only during sign-up
- Users can specify their starting balance (e.g., 56,000)
- Defaults to 10,000 if left empty
- Validation: 0 to 10,000,000 range

### 2. Database Trigger (`supabase/migrations/003_custom_initial_balance.sql`)
- Updated `handle_new_user()` function to read `initial_balance` from user metadata
- Maintains backward compatibility with default of 10,000
- Added validation to prevent negative or excessive values

### 3. Frontend Hook (`src/hooks/useShadowTransaction.ts`)
- Now fetches actual balance from Supabase profile on first load
- Ensures offline-first features work with correct initial balance

## How to Apply Migration

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/003_custom_initial_balance.sql`
4. Paste and run the SQL script
5. Verify the trigger was updated successfully

### Option 2: Using Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db push
```

### Option 3: Manual Migration
```bash
# Connect to your Supabase database and run:
psql -h db.your-project.supabase.co -U postgres -d postgres -f supabase/migrations/003_custom_initial_balance.sql
```

## Testing

### Test 1: Sign Up with Custom Balance
1. Go to the sign-up page
2. Enter email and password
3. Set "Initial Balance" to 56000
4. Complete sign-up
5. Check dashboard - balance should show Rs 56,000

### Test 2: Sign Up with Default Balance
1. Go to the sign-up page
2. Enter email and password
3. Leave "Initial Balance" empty
4. Complete sign-up
5. Check dashboard - balance should show Rs 10,000

### Test 3: Offline-First Sync
1. Sign up with custom balance (e.g., 75000)
2. Go offline
3. Make a transaction
4. Go online and sync
5. Balance should correctly reflect the custom initial balance minus transactions

## Rollback (if needed)

If you need to revert to the old behavior:

```sql
-- Restore original trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, balance)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    10000.00 -- Fixed starting balance
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Notes
- Existing users are not affected by this change
- The migration is backward compatible
- The frontend gracefully falls back to 10,000 if Supabase is unavailable
- All balances are stored as NUMERIC(12, 2) for precision

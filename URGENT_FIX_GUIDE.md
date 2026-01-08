# 🚨 URGENT: Apply Database Migration Now

## Your Issue
You entered **12,300** as initial balance but seeing **10,000** because the database migration hasn't been applied yet.

## Quick Fix (5 Minutes)

### Step 1: Open Supabase Dashboard
1. Go to your Supabase project: https://app.supabase.com
2. Select your **PhantomPay** project
3. Click **SQL Editor** in the left sidebar

### Step 2: Run the Migration
1. Click **"New Query"**
2. Open the file: `APPLY_THIS_MIGRATION.sql` in VS Code
3. **Copy ALL the SQL code** (Ctrl+A, Ctrl+C)
4. **Paste** into Supabase SQL Editor
5. Click **"Run"** or press Ctrl+Enter

### Step 3: Verify Success
You should see:
```
Success. No rows returned
```

### Step 4: Test with New User
**IMPORTANT:** The migration only affects NEW sign-ups!

1. **Sign out** from your current account
2. **Sign up** with a new email (e.g., test2@example.com)
3. Enter initial balance: **12300**
4. Sign up
5. ✅ Dashboard should now show **12,300**

## What About My Current Account?

Your current account already has a profile with 10,000. To fix it:

### Option A: Manual Update (Quick Fix)
Run this in Supabase SQL Editor:
```sql
-- Replace 'YOUR_USER_ID' with your actual user ID
UPDATE profiles 
SET balance = 12300 
WHERE id = 'YOUR_USER_ID';
```

To find your user ID:
```sql
-- Run this to see all users
SELECT id, email, balance FROM profiles;
```

### Option B: Create New Account
Just sign up with a new email and it will work correctly.

## Troubleshooting

### If Migration Fails
**Error:** "function handle_new_user already exists"
- **Solution:** The migration includes DROP statements, so this shouldn't happen. If it does, run:
```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
```
Then run the migration again.

### If Still Shows 10,000 After Migration
1. **Check:** Did you create a NEW account or using the old one?
   - Migration only affects NEW sign-ups
2. **Check:** Did you clear browser cache/IndexedDB?
   - Press F12 → Application → Clear storage
3. **Check:** Console logs for errors?
   - Press F12 → Console → Look for errors

## Files to Use
- **`APPLY_THIS_MIGRATION.sql`** ← Copy this entire file to Supabase SQL Editor

## Next Steps After Migration
1. ✅ Sign out from current account
2. ✅ Sign up with new email + initial balance
3. ✅ Verify balance shows correctly
4. ✅ Test offline transactions
5. ✅ Test sync functionality

---

**Need Help?** Check the browser console (F12) for any errors!

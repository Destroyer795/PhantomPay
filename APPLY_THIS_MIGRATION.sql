-- ⚠️ COPY THIS ENTIRE SCRIPT AND RUN IN SUPABASE SQL EDITOR ⚠️
-- This will update the database to support custom initial balances

-- Step 1: Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 2: Create updated function that reads initial_balance from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_initial_balance NUMERIC(12, 2);
BEGIN
  -- Try to get initial_balance from user metadata, default to 10000.00
  user_initial_balance := COALESCE(
    (NEW.raw_user_meta_data->>'initial_balance')::NUMERIC(12, 2),
    10000.00
  );

  -- Validate balance (prevent negative or unreasonably high values)
  IF user_initial_balance < 0 THEN
    user_initial_balance := 0;
  END IF;
  
  IF user_initial_balance > 10000000 THEN
    user_initial_balance := 10000000;
  END IF;

  -- Insert profile with custom or default balance
  INSERT INTO public.profiles (id, username, balance)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    user_initial_balance
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Add documentation
COMMENT ON FUNCTION public.handle_new_user() IS 
'Creates user profile with custom initial balance from user metadata. Defaults to 10000.00 if not provided.';

-- ✅ MIGRATION COMPLETE
-- New users will now get their custom initial balance!

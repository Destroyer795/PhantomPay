-- Migration: Custom Initial Balance Support
-- Date: 2026-01-08
-- Description: Allow users to set custom initial balance during sign-up

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Updated function to support custom initial balance from user metadata
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

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 
'Creates user profile with custom initial balance from user metadata. Defaults to 10000.00 if not provided.';

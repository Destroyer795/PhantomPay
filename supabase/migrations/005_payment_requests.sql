-- PhantomPay - PAYMENT REQUESTS
-- Run this in Supabase SQL Editor

-- Create payment_requests table for P2P money requests
CREATE TABLE IF NOT EXISTS payment_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  responded_at TIMESTAMPTZ
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_payment_requests_requester ON payment_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_payer ON payment_requests(payer_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);

-- Enable RLS
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view requests where they are requester or payer
CREATE POLICY "Users can view own requests"
  ON payment_requests FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = payer_id);

-- Policy: Users can insert requests (as requester)
CREATE POLICY "Users can create requests"
  ON payment_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- Policy: Payers can update request status
CREATE POLICY "Payers can respond to requests"
  ON payment_requests FOR UPDATE
  USING (auth.uid() = payer_id)
  WITH CHECK (auth.uid() = payer_id);

-- Enable Realtime for payment_requests table
ALTER PUBLICATION supabase_realtime ADD TABLE payment_requests;

-- RPC: Create a payment request
CREATE OR REPLACE FUNCTION create_payment_request(
  payer_email TEXT,
  request_amount NUMERIC,
  request_description TEXT DEFAULT ''
)
RETURNS JSONB AS $$
DECLARE
  requester_uuid UUID;
  payer_uuid UUID;
  new_request_id UUID;
BEGIN
  requester_uuid := auth.uid();
  
  IF requester_uuid IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- Look up payer by email
  SELECT id INTO payer_uuid FROM auth.users WHERE email = payer_email;
  
  IF payer_uuid IS NULL THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;

  IF payer_uuid = requester_uuid THEN
    RETURN jsonb_build_object('error', 'Cannot request money from yourself');
  END IF;

  -- Create the request
  INSERT INTO payment_requests (requester_id, payer_id, amount, description)
  VALUES (requester_uuid, payer_uuid, request_amount, request_description)
  RETURNING id INTO new_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', new_request_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Respond to a payment request (approve or reject)
CREATE OR REPLACE FUNCTION respond_to_request(
  request_id UUID,
  approve BOOLEAN
)
RETURNS JSONB AS $$
DECLARE
  payer_uuid UUID;
  requester_uuid UUID;
  request_amount NUMERIC;
  request_desc TEXT;
  payer_balance NUMERIC;
  the_request RECORD;
BEGIN
  payer_uuid := auth.uid();
  
  IF payer_uuid IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- Get the request
  SELECT * INTO the_request FROM payment_requests WHERE id = request_id;
  
  IF the_request IS NULL THEN
    RETURN jsonb_build_object('error', 'Request not found');
  END IF;

  IF the_request.payer_id != payer_uuid THEN
    RETURN jsonb_build_object('error', 'Not authorized');
  END IF;

  IF the_request.status != 'pending' THEN
    RETURN jsonb_build_object('error', 'Request already processed');
  END IF;

  requester_uuid := the_request.requester_id;
  request_amount := the_request.amount;
  request_desc := the_request.description;

  IF approve THEN
    -- Check payer has sufficient balance
    SELECT balance INTO payer_balance FROM profiles WHERE id = payer_uuid;
    
    IF payer_balance < request_amount THEN
      RETURN jsonb_build_object('error', 'Insufficient balance');
    END IF;

    -- Deduct from payer
    UPDATE profiles SET balance = balance - request_amount, last_synced_at = NOW()
    WHERE id = payer_uuid;

    -- Credit to requester
    UPDATE profiles SET balance = balance + request_amount, last_synced_at = NOW()
    WHERE id = requester_uuid;

    -- Create transactions for both parties
    INSERT INTO transactions (user_id, amount, type, description, status, offline_id, signature, recipient_id)
    VALUES (payer_uuid, request_amount, 'debit', 'Paid request: ' || request_desc, 'synced', 
            'req-' || request_id || '-pay', 'request-approved', requester_uuid);

    INSERT INTO transactions (user_id, amount, type, description, status, offline_id, signature, recipient_id)
    VALUES (requester_uuid, request_amount, 'credit', 'Received: ' || request_desc, 'synced', 
            'req-' || request_id || '-rcv', 'request-approved', payer_uuid);

    -- Update request status
    UPDATE payment_requests SET status = 'approved', responded_at = NOW()
    WHERE id = request_id;

    RETURN jsonb_build_object('success', true, 'status', 'approved');
  ELSE
    -- Reject the request
    UPDATE payment_requests SET status = 'rejected', responded_at = NOW()
    WHERE id = request_id;

    RETURN jsonb_build_object('success', true, 'status', 'rejected');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Get user email by ID (for displaying requester name)
CREATE OR REPLACE FUNCTION get_user_email(user_id_input UUID)
RETURNS TEXT AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = user_id_input;
  RETURN user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

'use client';

import React, { useState, useEffect } from 'react';
import { Check, X, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

/**
 * Incoming Payment Request Modal
 * 
 * Shows when another user requests money from the current user.
 * Allows approving (paying) or rejecting the request.
 */

interface PaymentRequest {
    id: string;
    requester_id: string;
    requester_email?: string;
    amount: number;
    description: string;
    created_at: string;
}

interface IncomingRequestModalProps {
    request: PaymentRequest;
    currentBalance: number;
    onRespond: () => void;
    onClose: () => void;
}

export function IncomingRequestModal({
    request,
    currentBalance,
    onRespond,
    onClose
}: IncomingRequestModalProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [requesterName, setRequesterName] = useState<string>('User');

    // Fetch requester's email/name
    useEffect(() => {
        const fetchRequester = async () => {
            // First try to get username from profiles
            const { data: profile } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', request.requester_id)
                .single();

            if (profile?.username) {
                setRequesterName(profile.username);
                return;
            }

            // Fallback: try to get email via RPC helper (get_recipient_email)
            // This requires an RPC function to be created, so we'll use another approach
            // Query the payment_requests table which might have requester info joined
            try {
                const { data: reqData } = await supabase
                    .rpc('get_user_email', { user_id_input: request.requester_id });

                if (reqData) {
                    // Show just the email username part before @
                    const emailName = reqData.split('@')[0];
                    setRequesterName(emailName);
                    return;
                }
            } catch (e) {
                // RPC might not exist yet
            }

            // Final fallback
            setRequesterName(request.requester_email?.split('@')[0] || 'A user');
        };
        fetchRequester();
    }, [request.requester_id, request.requester_email]);

    const handleResponse = async (approve: boolean) => {
        if (approve && currentBalance < request.amount) {
            setError('Insufficient balance');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            const { data, error: rpcError } = await supabase.rpc('respond_to_request', {
                request_id: request.id,
                approve: approve
            });

            if (rpcError) {
                throw new Error(rpcError.message);
            }

            if (data?.error) {
                throw new Error(data.error);
            }

            onRespond();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to process request');
            setIsProcessing(false);
        }
    };

    const insufficientBalance = currentBalance < request.amount;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative glass-card p-6 max-w-sm w-full animate-fade-in">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Payment Request</h3>
                        <p className="text-sm text-slate-400">From {requesterName}</p>
                    </div>
                </div>

                {/* Amount */}
                <div className="text-center py-4 mb-4 bg-white/5 rounded-xl">
                    <p className="text-3xl font-bold text-white">
                        ₹{request.amount.toLocaleString()}
                    </p>
                    {request.description && (
                        <p className="text-slate-400 mt-2 text-sm">
                            "{request.description}"
                        </p>
                    )}
                </div>

                {/* Balance Warning */}
                {insufficientBalance && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                        Insufficient balance. You have ₹{currentBalance.toLocaleString()}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={() => handleResponse(false)}
                        disabled={isProcessing}
                        className="flex-1 secondary-button flex items-center justify-center gap-2"
                    >
                        <X className="w-5 h-5" />
                        Decline
                    </button>
                    <button
                        onClick={() => handleResponse(true)}
                        disabled={isProcessing || insufficientBalance}
                        className="flex-1 primary-button flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
                    >
                        {isProcessing ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Check className="w-5 h-5" />
                        )}
                        Pay
                    </button>
                </div>
            </div>
        </div>
    );
}

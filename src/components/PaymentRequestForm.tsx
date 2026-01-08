'use client';

import React, { useState } from 'react';
import { Send, Loader2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

/**
 * Payment Request Form Component
 * 
 * Allows users to request money from another user by email.
 */

interface PaymentRequestFormProps {
    onSuccess?: () => void;
    onClose: () => void;
}

export function PaymentRequestForm({ onSuccess, onClose }: PaymentRequestFormProps) {
    const [email, setEmail] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const numAmount = parseFloat(amount);

        // Validate amount
        if (isNaN(numAmount) || !Number.isFinite(numAmount) || numAmount <= 0) {
            setError('Please enter a valid positive amount');
            return;
        }

        // Validate email
        if (!email.trim() || !email.includes('@')) {
            setError('Please enter a valid email address');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const { data, error: rpcError } = await supabase.rpc('create_payment_request', {
                payer_email: email.trim(),
                request_amount: numAmount,
                request_description: description || 'Payment request'
            });

            if (rpcError) {
                throw new Error(rpcError.message);
            }

            if (data?.error) {
                throw new Error(data.error);
            }

            setSuccess(true);
            setTimeout(() => {
                onSuccess?.();
                onClose();
            }, 1500);
        } catch (err: any) {
            setError(err.message || 'Failed to send request');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Request Money</h3>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                    <X className="w-5 h-5 text-slate-400" />
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Email Input */}
                <div className="mb-4">
                    <label htmlFor="request-email" className="block text-sm font-medium text-slate-400 mb-2">
                        Request From (Email)
                    </label>
                    <input
                        type="email"
                        id="request-email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="friend@example.com"
                        className="input-field"
                        disabled={isSubmitting}
                        required
                    />
                </div>

                {/* Amount Input */}
                <div className="mb-4">
                    <label htmlFor="request-amount" className="block text-sm font-medium text-slate-400 mb-2">
                        Amount (Rs)
                    </label>
                    <input
                        type="number"
                        id="request-amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0"
                        className="input-field text-2xl font-bold"
                        disabled={isSubmitting}
                        min="0"
                        step="0.01"
                        required
                    />
                </div>

                {/* Description Input */}
                <div className="mb-4">
                    <label htmlFor="request-description" className="block text-sm font-medium text-slate-400 mb-2">
                        Reason (Optional)
                    </label>
                    <input
                        type="text"
                        id="request-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What's this for?"
                        className="input-field"
                        disabled={isSubmitting}
                        maxLength={100}
                    />
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Success Message */}
                {success && (
                    <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm">
                        ✓ Request sent successfully!
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    className="primary-button w-full flex items-center justify-center gap-2"
                    disabled={isSubmitting || !amount || !email}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Sending...
                        </>
                    ) : (
                        <>
                            <Send className="w-5 h-5" />
                            Send Request
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}

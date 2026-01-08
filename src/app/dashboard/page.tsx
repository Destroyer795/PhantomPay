'use client';

import { useState, useEffect } from 'react';
import {
    Clock, ChevronRight, LogOut, Shield, RefreshCw, ArrowUpRight, ArrowDownLeft, QrCode, Wallet, Scan
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useShadowTransaction } from '@/hooks/useShadowTransaction';
import { BalanceCard } from '@/components/BalanceCard';
import { TransactionList } from '@/components/TransactionList';
import { PaymentForm } from '@/components/PaymentForm';
import { NetworkStatus } from '@/components/NetworkStatus';
import { VoiceAssistant } from '@/components/VoiceAssistant';
import { QRRequestModal } from '@/components/QRCodeGenerator';
import { QRPaymentModal } from '@/components/QRCodeScanner';
import { PaymentRequestForm } from '@/components/PaymentRequestForm';
import { IncomingRequestModal } from '@/components/IncomingRequestModal';

/**
 * Main Dashboard Page
 * 
 * This is the primary view showing:
 * - Balance (shadow balance for offline safety)
 * - Quick actions (Pay/Receive)
 * - Recent transactions
 * - Network status
 */

// Demo user ID removed. Using Supabase Auth.

export default function Dashboard() {
    const [userId, setUserId] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>('');
    const [isAuthChecking, setIsAuthChecking] = useState(true);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [showQRReceive, setShowQRReceive] = useState(false);
    const [showQRScan, setShowQRScan] = useState(false);
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [incomingRequest, setIncomingRequest] = useState<any>(null);
    const router = useRouter();

    // Check Authentication
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.replace('/');
            } else {
                setUserId(user.id);
                setUserName(user.email?.split('@')[0] || 'User');
                setIsAuthChecking(false);
            }
        };

        checkAuth();

        // Re-check auth when page becomes visible (handles browser back/forward)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkAuth();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Also check on popstate (browser back/forward buttons)
        const handlePopState = () => {
            checkAuth();
        };
        window.addEventListener('popstate', handlePopState);

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session) {
                router.replace('/');
            } else {
                setUserId(session.user.id);
                setUserName(session.user.email?.split('@')[0] || 'User');
                setIsAuthChecking(false);
            }
        });

        return () => {
            subscription.unsubscribe();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('popstate', handlePopState);
        };
    }, [router]);

    // Real-time subscription for incoming P2P payments
    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel('incoming-tx')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'transactions',
                    filter: `recipient_id=eq.${userId}`
                },
                async (payload) => {
                    console.log('🔔 Incoming P2P transaction received!', payload);
                    const { syncWalletFromServer } = require('@/lib/syncEngine');
                    await syncWalletFromServer(userId);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    // Realtime subscription for incoming payment requests + fetch pending on load
    useEffect(() => {
        if (!userId) return;

        // Fetch any pending requests when user logs in
        const fetchPendingRequests = async () => {
            const { data, error } = await supabase
                .from('payment_requests')
                .select('*')
                .eq('payer_id', userId)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(1);

            if (!error && data && data.length > 0) {
                console.log('📨 Found pending request on login:', data[0]);
                setIncomingRequest(data[0]);
            }
        };
        fetchPendingRequests();

        // Listen for new incoming requests in realtime
        const channel = supabase
            .channel('payment-requests')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'payment_requests',
                    filter: `payer_id=eq.${userId}`
                },
                (payload) => {
                    console.log('🔔 Incoming payment request!', payload);
                    setIncomingRequest(payload.new);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    // Handle Sign Out
    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.replace('/');
    };

    // Shadow transaction hook for offline-first logic
    const {
        shadowBalance,
        cachedBalance,
        pendingCount,
        isLoading,
        isOnline,
        addTransaction,
        syncNow
    } = useShadowTransaction(userId);

    // Live query for transactions from Dexie
    const transactions = useLiveQuery(
        () => {
            if (!userId) return [];
            return db.transactions
                .where('user_id')
                .equals(userId)
                .reverse()
                .sortBy('timestamp');
        },
        [userId]
    );

    // Handle payment submission
    const handlePayment = async (amount: number, description: string, recipientsDummy?: any, recipientId?: string) => {
        // Use 'debit' type. If recipientId is present, it becomes a P2P transfer
        const success = await addTransaction(amount, description, 'debit', recipientId);
        if (success) {
            setShowPaymentForm(false);
        }
        return success;
    };

    // Handle receiving money
    const handleReceive = async (amount: number, description: string) => {
        return await addTransaction(amount, description, 'credit');
    };

    // Handle QR payment (from scanner) - P2P transfer
    const handleQRPayment = async (amount: number, recipientId: string, description: string) => {
        // Pass recipientId for P2P transfer - server will credit recipient
        const success = await addTransaction(amount, description, 'debit', recipientId);
        if (success) {
            setShowQRScan(false);
        }
        return success;
    };

    // Handle balance query for voice assistant
    const handleBalanceQuery = async (): Promise<number> => {
        return shadowBalance;
    };

    // Handle transactions query for voice assistant
    const handleTransactionsQuery = async (): Promise<string> => {
        if (!transactions || transactions.length === 0) {
            return 'You have no transactions yet.';
        }

        const lastTransaction = transactions[0];
        const type = lastTransaction.type === 'debit' ? 'paid' : 'received';
        const timeAgo = formatTimeAgo(lastTransaction.timestamp);

        return `Your last transaction: ${type} ${lastTransaction.amount.toLocaleString('en-IN')} Rs for ${lastTransaction.description}, ${timeAgo}.`;
    };

    // Helper to format time ago
    const formatTimeAgo = (timestamp: number): string => {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);

        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
        return `${Math.floor(seconds / 86400)} days ago`;
    };

    // Show loading screen while checking auth
    if (isAuthChecking) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center animate-pulse">
                        <Shield className="w-10 h-10 text-white" />
                    </div>
                    <p className="text-slate-400 text-sm">Loading...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen pb-24">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0a0a0b]/90 backdrop-blur-xl border-b border-white/5">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-xl font-bold">
                            Phantom<span className="text-indigo-500">Pay</span>
                        </h1>
                    </div>

                    {/* Sync Button */}
                    {pendingCount > 0 && isOnline && (
                        <button
                            onClick={syncNow}
                            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 rounded-lg text-indigo-400 text-sm font-medium transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Sync {pendingCount}
                        </button>
                    )}

                    <button
                        onClick={handleSignOut}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors ml-2"
                        title="Sign Out"
                    >
                        <LogOut className="w-5 h-5 text-slate-400 hover:text-red-400" />
                    </button>
                </div>
            </header>

            <div className="container mx-auto px-4 py-6 space-y-6">
                {/* Network Status Banner */}
                <NetworkStatus
                    isOnline={isOnline}
                    pendingCount={pendingCount}
                    onSyncClick={syncNow}
                />

                {/* Balance Card */}
                <BalanceCard
                    shadowBalance={shadowBalance}
                    cachedBalance={cachedBalance}
                    pendingCount={pendingCount}
                    isOnline={isOnline}
                    isLoading={isLoading}
                />

                {/* Quick Actions */}
                <section className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => setShowPaymentForm(true)}
                        className="glass-card p-5 flex flex-col items-center gap-3 hover:border-indigo-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <div className="w-14 h-14 rounded-full bg-indigo-500/20 flex items-center justify-center">
                            <ArrowUpRight className="w-7 h-7 text-indigo-400" />
                        </div>
                        <span className="font-semibold text-white">Pay</span>
                    </button>

                    <button
                        onClick={() => setShowRequestForm(true)}
                        className="glass-card p-5 flex flex-col items-center gap-3 hover:border-emerald-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <ArrowDownLeft className="w-7 h-7 text-emerald-400" />
                        </div>
                        <span className="font-semibold text-white">Request</span>
                    </button>
                </section>

                {/* QR Actions */}
                <section className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => setShowQRScan(true)}
                        className="glass-card p-4 flex items-center gap-3 hover:border-purple-500/30 transition-colors"
                    >
                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <Scan className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="text-left">
                            <span className="font-medium text-white text-sm">Scan QR</span>
                            <p className="text-xs text-slate-500">Pay someone</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600 ml-auto" />
                    </button>

                    <button
                        onClick={() => setShowQRReceive(true)}
                        className="glass-card p-4 flex items-center gap-3 hover:border-emerald-500/30 transition-colors"
                    >
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <QrCode className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="text-left">
                            <span className="font-medium text-white text-sm">My QR</span>
                            <p className="text-xs text-slate-500">Receive payment</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600 ml-auto" />
                    </button>
                </section>

                {/* Transaction List */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-white">Recent Transactions</h2>
                        {transactions && transactions.length > 0 && (
                            <span className="text-sm text-slate-500">
                                {transactions.length} total
                            </span>
                        )}
                    </div>
                    <TransactionList
                        transactions={transactions || []}
                        isLoading={isLoading}
                    />
                </section>
            </div>

            {/* Payment Modal */}
            {showPaymentForm && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowPaymentForm(false)}
                    />
                    <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 animate-fade-in">
                        <PaymentForm
                            onSubmit={handlePayment}
                            maxAmount={shadowBalance}
                            disabled={false}
                        />
                        <button
                            onClick={() => setShowPaymentForm(false)}
                            className="mt-3 w-full secondary-button"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* QR Scanner Modal (Pay Mode) */}
            {showQRScan && userId && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowQRScan(false)}
                    />
                    <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 animate-fade-in">
                        <QRPaymentModal
                            userId={userId}
                            maxAmount={shadowBalance}
                            onPayment={handleQRPayment}
                            onClose={() => setShowQRScan(false)}
                        />
                    </div>
                </div>
            )}

            {/* QR Receive Modal */}
            {showQRReceive && userId && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowQRReceive(false)}
                    />
                    <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 animate-fade-in">
                        <QRRequestModal
                            userId={userId}
                            userName={userName}
                            onClose={() => setShowQRReceive(false)}
                        />
                    </div>
                </div>
            )}

            {/* Payment Request Modal */}
            {showRequestForm && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowRequestForm(false)}
                    />
                    <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 animate-fade-in">
                        <PaymentRequestForm
                            onSuccess={() => setShowRequestForm(false)}
                            onClose={() => setShowRequestForm(false)}
                        />
                    </div>
                </div>
            )}

            {/* Incoming Payment Request Modal */}
            {incomingRequest && (
                <IncomingRequestModal
                    request={incomingRequest}
                    currentBalance={shadowBalance}
                    onRespond={async () => {
                        // Refresh balance from Supabase since the payment was processed server-side
                        if (userId) {
                            const { data: profile } = await supabase
                                .from('profiles')
                                .select('balance')
                                .eq('id', userId)
                                .single();

                            if (profile) {
                                // Force refresh the wallet state
                                const { updateWalletState } = await import('@/lib/db');
                                await updateWalletState({
                                    id: userId,
                                    cached_balance: parseFloat(profile.balance),
                                    shadow_balance: parseFloat(profile.balance),
                                    last_updated: Date.now()
                                });
                            }
                        }
                        // Also trigger normal sync
                        syncNow();
                    }}
                    onClose={() => setIncomingRequest(null)}
                />
            )}

            {/* Voice Assistant with AI */}
            <VoiceAssistant
                onTransaction={addTransaction}
                currentBalance={shadowBalance}
                onBalanceQuery={handleBalanceQuery}
                onTransactionsQuery={handleTransactionsQuery}
                disabled={isLoading}
            />

            {/* Bottom Navigation (for mobile) */}
            <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0a0b]/95 backdrop-blur-xl border-t border-white/5 py-2 px-4 sm:hidden">
                <div className="flex items-center justify-around">
                    <button className="flex flex-col items-center gap-1 px-4 py-2 text-indigo-400">
                        <Wallet className="w-5 h-5" />
                        <span className="text-xs font-medium">Wallet</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 px-4 py-2 text-slate-500">
                        <Clock className="w-5 h-5" />
                        <span className="text-xs font-medium">History</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 px-4 py-2 text-slate-500">
                        <QrCode className="w-5 h-5" />
                        <span className="text-xs font-medium">QR</span>
                    </button>
                </div>
            </nav>
        </main>
    );
}

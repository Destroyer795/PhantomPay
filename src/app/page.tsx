'use client';

import React, { useState } from 'react';
import { Shield, Mail, Lock, Loader2, AlertCircle, Wallet } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [initialBalance, setInitialBalance] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [configError, setConfigError] = useState(false);
    const router = useRouter();


    React.useEffect(() => {
        if (!isSupabaseConfigured()) {
            setConfigError(true);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setMessage(null);

        console.log('Attempting auth:', { isSignUp, email });

        try {
            if (isSignUp) {
                // Validate initial balance
                const balanceValue = initialBalance ? parseFloat(initialBalance) : 10000;
                if (isNaN(balanceValue) || balanceValue < 0) {
                    throw new Error('Please enter a valid initial balance');
                }
                if (balanceValue > 10000000) {
                    throw new Error('Initial balance cannot exceed 10,000,000');
                }

                // Sign up
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/`,
                        data: {
                            initial_balance: balanceValue
                        }
                    }
                });

                if (error) {
                    console.error('Sign up error:', error);
                    throw error;
                }

                console.log('Sign up success:', data);

                if (data.session) {
                    // Email confirmation is disabled
                    router.push('/dashboard');
                    router.refresh();
                } else {
                    // Email confirmation is enabled
                    setMessage('Account created! Please check your email inbox (and spam) to confirm.');
                }
            } else {
                // Sign in
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) {
                    console.error('Sign in error:', error);
                    throw error;
                }

                console.log('Sign in success:', data);
                router.push('/dashboard');
                router.refresh();
            }
        } catch (err: any) {
            console.error('Auth handler caught error:', err);
            setError(err.message || 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4 animate-float">
                        <Shield className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">
                        Phantom<span className="text-indigo-500">Pay</span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-2">
                        Offline-First Payment Tracker
                    </p>
                </div>

                <div className="glass-card p-6">
                    {/* Config Error Warning */}
                    {configError && (
                        <div className="mb-6 p-4 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <h3 className="text-sm font-semibold text-amber-200">Missing Configuration</h3>
                                <p className="text-xs text-amber-200/80">
                                    Supabase environment variables appear to be missing or using default values.
                                    Auth will not work until you configure <code>.env.local</code>.
                                </p>
                            </div>
                        </div>
                    )}

                    <h2 className="text-xl font-bold text-white mb-6 text-center">
                        {isSignUp ? 'Create Account' : 'Welcome Back'}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-400 mb-2">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="input-field input-field-with-icon"
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-400 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="password"
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="input-field input-field-with-icon"
                                    required
                                    minLength={6}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        {/* Initial Balance - Only show during sign up */}
                        {isSignUp && (
                            <div>
                                <label htmlFor="initialBalance" className="block text-sm font-medium text-slate-400 mb-2">
                                    Initial Balance (Rs)
                                </label>
                                <div className="relative">
                                    <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <input
                                        type="number"
                                        id="initialBalance"
                                        value={initialBalance}
                                        onChange={(e) => setInitialBalance(e.target.value)}
                                        placeholder="10000"
                                        className="input-field input-field-with-icon"
                                        min="0"
                                        max="10000000"
                                        step="100"
                                        disabled={isLoading}
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-1.5">
                                    {initialBalance && !isNaN(parseFloat(initialBalance)) 
                                        ? `Starting with Rs ${parseFloat(initialBalance).toLocaleString()}`
                                        : 'Leave empty for default (Rs 10,000)'}
                                </p>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="flex flex-col gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    {error}
                                </div>
                                {error.includes('already registered') && (
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            setMessage(null);
                                            setError(null);
                                            setIsLoading(true);
                                            const { error: resendError } = await supabase.auth.resend({
                                                type: 'signup',
                                                email,
                                                options: {
                                                    emailRedirectTo: `${window.location.origin}/`,
                                                }
                                            });
                                            setIsLoading(false);
                                            if (resendError) {
                                                setError(resendError.message);
                                            } else {
                                                setMessage('Confirmation email sent! Please check your inbox and spam folder.');
                                            }
                                        }}
                                        className="text-xs font-semibold underline hover:text-red-300 text-left"
                                    >
                                        Resend Confirmation Email?
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Success Message */}
                        {message && (
                            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm">
                                {message}
                            </div>
                        )}

                        {/* Submit */}


                        <button
                            type="submit"
                            className="primary-button w-full flex items-center justify-center gap-2"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {isSignUp ? 'Creating Account...' : 'Signing In...'}
                                </>
                            ) : (
                                isSignUp ? 'Create Account' : 'Sign In'
                            )}
                        </button>
                    </form>

                    {/* Toggle */}
                    <div className="mt-6 text-center">
                        <button
                            onClick={() => {
                                setIsSignUp(!isSignUp);
                                setError(null);
                                setMessage(null);
                                setInitialBalance(''); // Clear initial balance when toggling
                            }}
                            className="text-slate-400 hover:text-white text-sm transition-colors"
                        >
                            {isSignUp
                                ? 'Already have an account? Sign in'
                                : "Don't have an account? Sign up"}
                        </button>
                    </div>
                </div>

                {/* Demo Note */}
                <p className="text-center text-slate-600 text-xs mt-6">
                    Build2Break Hackathon 2026
                </p>
            </div>
        </main>
    );
}

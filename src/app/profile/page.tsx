'use client';

import React, { useState } from 'react';
import { ArrowLeft, User, QrCode, Settings, LogOut, Shield, Bell, Moon } from 'lucide-react';
import Link from 'next/link';
import { QRCodeGenerator, QRRequestModal } from '@/components/QRCodeGenerator';

/**
 * Profile Page
 * 
 * Shows user info and QR code for receiving payments.
 * Member C/D can enhance with:
 * - User settings
 * - Transaction history export
 * - Theme settings
 */

// Demo user (in production from Supabase Auth)
const DEMO_USER = {
    id: 'demo-user-001',
    name: 'Demo User',
    email: 'demo@phantompay.app'
};

export default function ProfilePage() {
    const [showQRModal, setShowQRModal] = useState(false);

    return (
        <main className="min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0a0a0b]/90 backdrop-blur-xl border-b border-white/5">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/"
                            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-white" />
                        </Link>
                        <h1 className="text-lg font-bold text-white">Profile</h1>
                    </div>
                    <button className="text-slate-400 hover:text-white transition-colors">
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <div className="container mx-auto px-4 py-6 space-y-6">
                {/* User Card */}
                <section className="glass-card p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <User className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">{DEMO_USER.name}</h2>
                            <p className="text-slate-400 text-sm">{DEMO_USER.email}</p>
                            <p className="text-slate-600 text-xs mt-1">ID: {DEMO_USER.id.slice(0, 12)}...</p>
                        </div>
                    </div>

                    {/* QR Button */}
                    <button
                        onClick={() => setShowQRModal(true)}
                        className="w-full primary-button flex items-center justify-center gap-2"
                    >
                        <QrCode className="w-5 h-5" />
                        Show My QR Code
                    </button>
                </section>

                {/* Quick Stats */}
                <section className="grid grid-cols-2 gap-4">
                    <div className="glass-card p-4 text-center">
                        <p className="text-2xl font-bold text-white">10,000</p>
                        <p className="text-slate-500 text-sm">Balance</p>
                    </div>
                    <div className="glass-card p-4 text-center">
                        <p className="text-2xl font-bold text-emerald-400">0</p>
                        <p className="text-slate-500 text-sm">Transactions</p>
                    </div>
                </section>

                {/* Settings Menu */}
                <section className="glass-card overflow-hidden">
                    <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider px-4 pt-4 pb-2">
                        Settings
                    </h3>

                    <button className="w-full flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors">
                        <Bell className="w-5 h-5 text-slate-400" />
                        <span className="text-white flex-1 text-left">Notifications</span>
                        <div className="w-10 h-6 rounded-full bg-indigo-500 relative">
                            <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white"></div>
                        </div>
                    </button>

                    <button className="w-full flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors">
                        <Moon className="w-5 h-5 text-slate-400" />
                        <span className="text-white flex-1 text-left">Dark Mode</span>
                        <div className="w-10 h-6 rounded-full bg-indigo-500 relative">
                            <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white"></div>
                        </div>
                    </button>

                    <button className="w-full flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors">
                        <Shield className="w-5 h-5 text-slate-400" />
                        <span className="text-white flex-1 text-left">Security</span>
                        <span className="text-slate-600 text-sm">→</span>
                    </button>

                    <div className="border-t border-white/5 mt-2">
                        <button className="w-full flex items-center gap-4 px-4 py-3 hover:bg-red-500/10 transition-colors text-red-400">
                            <LogOut className="w-5 h-5" />
                            <span className="flex-1 text-left">Sign Out</span>
                        </button>
                    </div>
                </section>

                {/* App Info */}
                <section className="text-center pt-4">
                    <p className="text-slate-600 text-sm">PhantomPay v0.1.0</p>
                    <p className="text-slate-700 text-xs mt-1">Build2Break Hackathon 2026</p>
                </section>
            </div>

            {/* QR Modal */}
            {showQRModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowQRModal(false)}
                    />
                    <div className="relative w-full max-w-sm animate-fade-in">
                        <QRRequestModal
                            userId={DEMO_USER.id}
                            userName={DEMO_USER.name}
                            onClose={() => setShowQRModal(false)}
                        />
                    </div>
                </div>
            )}
        </main>
    );
}

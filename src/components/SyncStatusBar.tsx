'use client';

import React from 'react';
import { WifiOff, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * SyncStatusBar Component
 * 
 * Implements the "Superhuman Bar" pattern with hysteresis.
 * Only appears when the user needs to know about sync issues.
 * 
 * Key behaviors:
 * - Invisible during normal operation
 * - Appears after 5-10s delay when offline (hysteresis)
 * - Shows sync errors and retry status
 * - Disappears immediately upon successful reconnection
 * - Non-intrusive, bottom-fixed positioning
 */

interface SyncStatusBarProps {
    isOnline: boolean;
    showOfflineIndicator: boolean;
    connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
    syncStatus: 'idle' | 'syncing' | 'success' | 'error';
    pendingCount?: number;
    onRetrySync?: () => void;
}

export function SyncStatusBar({
    isOnline,
    showOfflineIndicator,
    connectionQuality,
    syncStatus,
    pendingCount = 0,
    onRetrySync
}: SyncStatusBarProps) {
    // Determine if bar should be visible
    const shouldShow = showOfflineIndicator || syncStatus === 'syncing' || syncStatus === 'error';

    // Determine bar variant
    const getBarConfig = () => {
        if (syncStatus === 'error') {
            return {
                bg: 'bg-red-900/90',
                border: 'border-red-500/50',
                icon: <AlertTriangle size={16} />,
                text: 'Sync failed - Connection issue',
                showRetry: true,
                iconColor: 'text-red-400'
            };
        }

        if (syncStatus === 'syncing') {
            return {
                bg: 'bg-blue-900/90',
                border: 'border-blue-500/50',
                icon: <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><RefreshCw size={16} /></motion.div>,
                text: pendingCount > 0 ? `Syncing ${pendingCount} item${pendingCount > 1 ? 's' : ''}...` : 'Syncing...',
                showRetry: false,
                iconColor: 'text-blue-400'
            };
        }

        if (showOfflineIndicator) {
            return {
                bg: 'bg-neutral-900/95',
                border: 'border-neutral-700',
                icon: <WifiOff size={16} />,
                text: pendingCount > 0 
                    ? `Offline - ${pendingCount} pending transaction${pendingCount > 1 ? 's' : ''}`
                    : 'Working in offline mode',
                showRetry: false,
                iconColor: 'text-neutral-400'
            };
        }

        return null;
    };

    const config = getBarConfig();

    if (!config || !shouldShow) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={`fixed bottom-0 left-0 right-0 z-50 ${config.bg} backdrop-blur-lg border-t ${config.border} px-4 py-3 shadow-2xl`}
            >
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    {/* Left: Status Message */}
                    <div className="flex items-center gap-3">
                        <div className={config.iconColor}>
                            {config.icon}
                        </div>
                        <span className="text-sm font-medium text-white">
                            {config.text}
                        </span>
                        {connectionQuality === 'poor' && isOnline && (
                            <span className="text-xs text-orange-400 bg-orange-500/20 px-2 py-0.5 rounded-full">
                                Slow connection
                            </span>
                        )}
                    </div>

                    {/* Right: Action Button */}
                    {config.showRetry && onRetrySync && (
                        <button
                            onClick={onRetrySync}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 rounded-lg transition-colors text-sm font-medium"
                        >
                            <RefreshCw size={14} />
                            Retry
                        </button>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

/**
 * Compact Sync Status Pill (for header)
 * 
 * Shows in header as a clickable indicator.
 * Green check when all synced, yellow clock with count when pending.
 */

interface SyncStatusPillProps {
    queueCount: number;
    hasFailed: boolean;
    onClick?: () => void;
}

export function SyncStatusPill({ queueCount, hasFailed, onClick }: SyncStatusPillProps) {
    if (queueCount === 0 && !hasFailed) {
        return (
            <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={onClick}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-full transition-colors text-xs font-medium"
            >
                <CheckCircle size={14} />
                <span>All synced</span>
            </motion.button>
        );
    }

    return (
        <motion.button
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            onClick={onClick}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors text-xs font-medium ${
                hasFailed
                    ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                    : 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-400'
            }`}
        >
            {hasFailed ? <AlertTriangle size={14} /> : <RefreshCw size={14} className="animate-spin" />}
            <span>{queueCount} pending</span>
        </motion.button>
    );
}

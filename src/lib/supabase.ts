import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

// Validate environment variables in browser
if (typeof window !== 'undefined') {
    if (!supabaseUrl || supabaseUrl === 'https://your-project-id.supabase.co') {
        console.error('⚠️ Supabase URL is missing or not configured!');
    }
    if (!supabaseAnonKey || supabaseAnonKey === 'your-anon-key-here') {
        console.error('⚠️ Supabase Anon Key is missing or not configured!');
    }
}

/**
 * Supabase client instance
 * Used for authentication and cloud database operations
 */
export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder'
);

/**
 * Check if Supabase is properly configured
 */
export function isSupabaseConfigured(): boolean {
    return (
        !!supabaseUrl &&
        supabaseUrl !== 'https://your-project-id.supabase.co' &&
        !!supabaseAnonKey &&
        supabaseAnonKey !== 'your-anon-key-here'
    );
}

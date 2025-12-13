import { createClient } from '@supabase/supabase-js';

// Helper to safely access env vars in Vite or standard environments
const getEnv = (key: string) => {
  // Try Vite's import.meta.env first
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  // Fallback to process.env (for some server-side or non-Vite contexts)
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    // @ts-ignore
    return process.env[key];
  }
  return '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL')?.trim();
const supabaseKey = getEnv('VITE_SUPABASE_KEY')?.trim();

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseKey && supabaseUrl !== 'undefined' && supabaseUrl !== '';

if (!isSupabaseConfigured) {
  console.warn("SUPABASE CONFIGURATION MISSING:");
  if (!supabaseUrl) console.warn("- VITE_SUPABASE_URL is missing");
  if (!supabaseKey) console.warn("- VITE_SUPABASE_KEY is missing");
  console.warn("The app will run in OFFLINE/DEMO MODE. Data will NOT persist after refresh.");
}

// Create client with fallback values to prevent whitespace crash on load.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseKey || 'placeholder'
);

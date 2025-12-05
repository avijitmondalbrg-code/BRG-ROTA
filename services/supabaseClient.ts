import { createClient } from '@supabase/supabase-js';

// Helper to safely access env vars in Vite or standard environments
const getEnv = (key: string) => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key];
  }
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env) {
    // @ts-ignore
    return process.env[key];
  }
  return '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL')?.trim();
const supabaseKey = getEnv('VITE_SUPABASE_KEY')?.trim();

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseKey && supabaseUrl !== 'undefined';

if (!isSupabaseConfigured) {
  console.warn("Supabase credentials missing. App running in offline/demo mode.");
}

// Create client with fallback values to prevent whitespace crash on load.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseKey || 'placeholder'
);
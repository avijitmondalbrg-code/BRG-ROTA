
import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {}
  if (typeof window !== 'undefined' && (window as any)[key]) {
    return (window as any)[key];
  }
  return '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL').trim();
const supabaseKey = getEnv('VITE_SUPABASE_KEY').trim();

// Check if keys are correctly formatted
export const isSupabaseConfigured = 
  !!supabaseUrl && 
  !!supabaseKey && 
  supabaseUrl.startsWith('https://') &&
  supabaseKey.length > 50; // Supabase keys are long JWTs

if (supabaseUrl && !isSupabaseConfigured) {
    console.error("Supabase Config Issue: Check if VITE_SUPABASE_URL starts with https:// and VITE_SUPABASE_KEY is the long 'anon public' key.");
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseKey || 'placeholder'
);

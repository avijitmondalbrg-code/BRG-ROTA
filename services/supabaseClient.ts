
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

// Enhanced check: Supabase keys must be long JWT tokens (starting with ey...)
export const isSupabaseConfigured = 
  !!supabaseUrl && 
  !!supabaseKey && 
  supabaseUrl.startsWith('https://') &&
  supabaseKey.startsWith('ey'); // Supabase anon keys are JWTs starting with 'ey'

if (!isSupabaseConfigured && supabaseUrl) {
  if (!supabaseKey.startsWith('ey')) {
    console.error("INVALID SUPABASE KEY: The provided key doesn't look like a Supabase key. It should start with 'ey...'. Please check your Supabase Dashboard > Settings > API.");
  }
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseKey || 'placeholder'
);

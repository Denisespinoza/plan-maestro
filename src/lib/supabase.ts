import { createClient } from '@supabase/supabase-js';
import { config } from './config';

// Only create Supabase client if properly configured
let supabaseInstance: ReturnType<typeof createClient> | null = null;

if (config.isConfigured && config.supabaseUrl && config.supabaseAnonKey) {
  supabaseInstance = createClient(config.supabaseUrl, config.supabaseAnonKey);
}

// Export as non-null for existing code, but check config in component tree
export const supabase = supabaseInstance!;

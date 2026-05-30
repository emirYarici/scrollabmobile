import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Client Configuration
 * 
 * Replace the values below with your actual Supabase Project URL and Anon Public Key.
 * In production, you would typically load these from an environment variable manager
 * like react-native-config or react-native-dotenv.
 */
const SUPABASE_URL = 'https://ufpyjlhflfkvmkzgaafc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmcHlqbGhmbGZrdm1remdhYWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMTg3OTEsImV4cCI6MjA4NDg5NDc5MX0.COpktnBmnHm_92N5S1oqbvqAKKWY1qgZrqck6crxOkE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Critical to avoid OAuth redirect loop issues on mobile
  },
});

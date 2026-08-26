import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://chyszlzdswgfnfrtybbk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Z5BmzdgvvefZl9Vfytemqw_pNN1el5a';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
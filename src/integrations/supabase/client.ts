import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://izctgsufbxlbxxvhzaxv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6Y3Rnc3VmYnhsYnh4dmh6YXh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MzY3NTAsImV4cCI6MjA3MzAxMjc1MH0.zGKwHLXVp7rI5hfjRiti5LsHQI5LI2MSOecalum2ilw';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
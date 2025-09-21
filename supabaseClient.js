
// supabaseClient.js
// Fill in your Supabase project URL and anon key below.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = localStorage.getItem("APP_SUPABASE_URL") || "https://jxebbwfofurrpchxzlqd.supabase.co";
export const SUPABASE_ANON_KEY = localStorage.getItem("APP_SUPABASE_ANON_KEY") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4ZWJid2ZvZnVycnBjaHh6bHFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MDk4MzksImV4cCI6MjA3MzA4NTgzOX0.9tNHoDIUuMTmbI_ktmEjroMr7HE9t1F9CWh6HamleBk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});

export async function ensureSignedIn() {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.error("Supabase anonymous sign-in failed:", error);
    throw error;
  }
  return data.user;
}

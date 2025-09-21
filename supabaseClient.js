
// supabaseClient.js
// Fill in your Supabase project URL and anon key below.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = localStorage.getItem("APP_SUPABASE_URL") || "https://YOUR-PROJECT.supabase.co";
export const SUPABASE_ANON_KEY = localStorage.getItem("APP_SUPABASE_ANON_KEY") || "YOUR-ANON-KEY";

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

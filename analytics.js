
// analytics.js
import { supabase, ensureSignedIn } from "./supabaseClient.js";

let currentSessionId = null;

async function startSession(grade) {
  const user = await ensureSignedIn();
  const { data, error } = await supabase
    .from("sessions")
    .insert({ user_id: user.id, grade })
    .select("id")
    .single();
  if (error) {
    console.warn("startSession error", error);
    currentSessionId = null;
    return null;
  }
  currentSessionId = data.id;
  return currentSessionId;
}

async function recordAnswer(grade, word, isCorrect) {
  try {
    const user = await ensureSignedIn();
    const payload = {
      user_id: user.id,
      session_id: currentSessionId,
      grade,
      word,
      is_correct: !!isCorrect
    };
    const { error } = await supabase.from("answers").insert(payload);
    if (error) console.warn("recordAnswer error", error);
  } catch (e) {
    console.warn("recordAnswer failed", e);
  }
}

async function getWordStats(grade, word) {
  const { data, error } = await supabase
    .from("question_stats")
    .select("correct_count, wrong_count, last_answered")
    .eq("grade", grade)
    .eq("word", word)
    .maybeSingle();
  if (error) {
    console.warn("getWordStats error", error);
    return null;
  }
  return data || { correct_count: 0, wrong_count: 0, last_answered: null };
}

async function renderWordStats(grade, word) {
  const el = document.getElementById("wordStats");
  if (!el) return;
  el.textContent = "กำลังโหลดสถิติ…";
  const stats = await getWordStats(grade, word);
  const c = stats?.correct_count || 0;
  const w = stats?.wrong_count || 0;
  const total = c + w;
  const pct = total ? Math.round((c / total) * 100) : 0;
  const last = stats?.last_answered ? new Date(stats.last_answered).toLocaleString() : "—";
  el.innerHTML = `
    <div class="ws-row">
      <div><strong>สถิติคำนี้</strong></div>
      <div class="ws-grid">
        <span>ถูก</span><span>${c}</span>
        <span>ผิด</span><span>${w}</span>
        <span>% ถูก</span><span>${pct}%</span>
        <span>ล่าสุด</span><span>${last}</span>
      </div>
    </div>
  `;
}

export const Analytics = { startSession, recordAnswer, renderWordStats };

// Expose globally for game.js hooks
window.Analytics = Analytics;

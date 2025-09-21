
// lineAuth.js
import { supabase } from "./supabaseClient.js";

const LIFF_ID = "2005494853-OmBe7AAY";

export const User = {
  isReady: false,
  isLoggedIn: false,
  lineUserId: null,
  displayName: null,
  pictureUrl: null,
  role: null,
  classroom: null,
  supabaseUserId: null,
};

function showToast(msg, ms=2200){
  const t = document.getElementById('toast'); if(!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), ms);
}

function wireLoginButton(){
  const btn = document.getElementById('btnLineLogin');
  if(!btn) return;
  if (User.isLoggedIn && User.lineUserId){
    btn.style.display = 'none';
  } else {
    btn.style.display = 'inline-flex';
    btn.onclick = () => { try { liff.login(); } catch(e){ console.warn(e); } };
  }
}

async function initLiff() {
  try {
    await liff.init({ liffId: LIFF_ID });
    if (!liff.isLoggedIn()) {
      console.log("LIFF not logged in, play-only mode.");
      window.User = User;
      updateBadge();
      wireLoginButton();
      showToast("ตอนนี้เป็นโหมดเล่นอย่างเดียว");
      return;
    }
    User.isLoggedIn = true;
    const profile = await liff.getProfile();
    User.lineUserId = profile.userId;
    User.displayName = profile.displayName;
    User.pictureUrl = profile.pictureUrl || null;

    // Upsert to users table
    const payload = {
      line_user_id: User.lineUserId,
      display_name: User.displayName,
      picture_url: User.pictureUrl,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from("users").upsert(payload, { onConflict: "line_user_id" }).select("*").single();
    if (error) console.warn("users upsert error:", error);
    if (data) {
      User.role = data.role || null;
      User.classroom = data.classroom || null;
      User.supabaseUserId = data.supabase_user_id || null;
    }

    window.User = User;
    updateBadge();
    wireLoginButton();
  } catch (e) {
    console.warn("LIFF init failed:", e);
    window.User = User;
    updateBadge();
    wireLoginButton();
  } finally {
    User.isReady = true;
  }
}

function updateBadge() {
  const badge = document.getElementById("userBadge");
  if (!badge) return;
  if (User.isLoggedIn && User.lineUserId) {
    badge.style.display = "flex";
    const av = document.getElementById("userAvatar");
    const nm = document.getElementById("userName");
    const rl = document.getElementById("userRole");
    if (av) av.src = User.pictureUrl || "";
    if (nm) nm.textContent = User.displayName || "LINE User";
    if (rl) rl.textContent = User.role ? `(${User.role})` : "";
  } else {
    badge.style.display = "none";
  }
}

initLiff();

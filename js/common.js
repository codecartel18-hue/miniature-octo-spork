/* ==========================================================================
   QUAD LOCKER — common.js
   Shared on every page: storage helpers, auth state, nav/menu wiring, toast.
   Frontend-only prototype — all "backend" state lives in localStorage.
   ========================================================================== */

const ADMIN_EMAIL = "ayeshaa@kazi.com";
const DEFAULT_ADMIN_PASSWORD = "QuadAdmin#2026"; // seeded on first load, see ensureSeedAdmin()
const REDIRECT_KEY = "quadLockerRedirect";
const STORE = {
  users: "quadLockerUsers",       // [{name,email,password,isAdmin,credits,joinedAt}]
  session: "quadLockerSession",   // email of the signed-in user
  reports: "campusFindReports"    // user-submitted reports
};
const CREDIT_AWARD_ON_RETURN = 15;

/* ---------- generic storage helpers ---------- */
function readJSON(key, fallback){
  try{ const v = JSON.parse(localStorage.getItem(key)); return v === null || v === undefined ? fallback : v; }
  catch{ return fallback; }
}
function writeJSON(key, value){ localStorage.setItem(key, JSON.stringify(value)); }

function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}

/* ---------- users / auth ---------- */
function getUsers(){ return readJSON(STORE.users, []); }
function saveUsers(list){ writeJSON(STORE.users, list); }
function findUser(email){
  email = (email || "").trim().toLowerCase();
  return getUsers().find(u => u.email === email) || null;
}
function registerUser({name, email, password}){
  email = (email || "").trim().toLowerCase();
  name = (name || "").trim();
  const users = getUsers();
  if(users.some(u => u.email === email)){
    return {ok:false, error:"An account with this email already exists. Try logging in instead."};
  }
  const user = {
    name, email, password,
    isAdmin: email === ADMIN_EMAIL,
    credits: 0,
    joinedAt: new Date().toISOString().slice(0,10)
  };
  users.push(user);
  saveUsers(users);
  setSession(email);
  return {ok:true, user};
}
function loginUser(email, password){
  email = (email || "").trim().toLowerCase();
  const user = findUser(email);
  if(!user) return {ok:false, error:"No account found with that email. Register first."};
  if(user.password !== password) return {ok:false, error:"That password doesn't match our records."};
  setSession(email);
  return {ok:true, user};
}
function setSession(email){ localStorage.setItem(STORE.session, email || ""); }
function getCurrentUser(){
  const email = localStorage.getItem(STORE.session);
  if(!email) return null;
  return findUser(email);
}
function updateCurrentUser(patch){
  const email = localStorage.getItem(STORE.session);
  if(!email) return null;
  const users = getUsers();
  const idx = users.findIndex(u => u.email === email);
  if(idx < 0) return null;
  users[idx] = {...users[idx], ...patch};
  saveUsers(users);
  if(patch.email && patch.email !== email) setSession(patch.email);
  return users[idx];
}
function addCreditsTo(email, amount){
  email = (email || "").trim().toLowerCase();
  const users = getUsers();
  const idx = users.findIndex(u => u.email === email);
  if(idx < 0) return;
  users[idx].credits = (users[idx].credits || 0) + amount;
  saveUsers(users);
}
function logoutUser(){
  setSession("");
  showToast("You have been logged out.");
  setTimeout(() => { window.location.href = "index.html"; }, 400);
}

/* Seeds one ready-to-use admin account on first load so the console is
   reachable out of the box. Never overwrites a real admin account that has
   already been created (or had its password changed) by a user. */
function ensureSeedAdmin(){
  const users = getUsers();
  if(users.some(u => u.email === ADMIN_EMAIL)) return;
  users.push({
    name: "Ayesha (Admin)",
    email: ADMIN_EMAIL,
    password: DEFAULT_ADMIN_PASSWORD,
    isAdmin: true,
    credits: 0,
    joinedAt: new Date().toISOString().slice(0,10)
  });
  saveUsers(users);
}

/* Shared auth-feedback banner used by the login and register pages. */
function showAuthFeedback(type, title, message){
  const box = document.getElementById("authFeedback");
  if(!box) return;
  box.className = "auth-feedback show " + (type === "success" ? "success" : "error");
  box.innerHTML = `<span class="feedback-title">${escapeHtml(title)}</span>${escapeHtml(message)}`;
}

/* Where to send someone after they log in: an in-progress destination
   (e.g. they tried to open Report while signed out) takes priority,
   otherwise admins land on the console and students land on their profile. */
function postLoginDestination(user){
  const redirect = sessionStorage.getItem(REDIRECT_KEY);
  sessionStorage.removeItem(REDIRECT_KEY);
  if(redirect) return redirect;
  return user.isAdmin ? "admin.html" : "profile.html";
}

/* ---------- reports ---------- */
/* DEMO_REPORTS (starter rows) now live in js/seed-data.js — load order in
   every .html file is seed-data.js, then common.js. */
function getSavedReports(){ return readJSON(STORE.reports, []); }
function saveSavedReports(list){ writeJSON(STORE.reports, list); }
/* Saved reports overlay the seed data by id, rather than sitting alongside
   it — otherwise editing/claiming a demo row (which gets copied into
   localStorage the first time it changes) would leave the untouched demo
   copy in the list too, showing as a confusing duplicate everywhere
   (admin table, Discover, My Reports) instead of replacing it. */
function getReports(){
  const saved = getSavedReports();
  const savedIds = new Set(saved.map(r => r.id));
  const seedRemaining = DEMO_REPORTS.filter(r => !savedIds.has(r.id));
  return [...saved, ...seedRemaining];
}
/* Discover only ever shows items someone FOUND and handed in — a "lost"
   report has no physical item for another student to claim, so it never
   gets a card on the public feed even while it's open. Beyond that, the
   rule is simply: show every found item that isn't currently claimed and
   isn't already fully resolved. That means REPORTED, IN_SECURE_STORAGE,
   MATCH_PENDING and even UNCLAIMED items are all browsable (an item can
   sit unclaimed for a while and still get picked up before it's donated/
   returned/institutionalized) — the moment a claim is actually submitted
   on it (status not DECLINED), it comes off the feed and moves into the
   VERIFICATION_PENDING queue; once it's RECOVERED/DONATED/RETURNED_TO_
   FINDER/INSTITUTIONAL_PROPERTY it's resolved and drops off for good. */
function getUnclaimedReports(){
  const RESOLVED_STATUSES = ["RECOVERED","DONATED","RETURNED_TO_FINDER","INSTITUTIONAL_PROPERTY"];
  return getReports().filter(r =>
    r.type === "found" &&
    !RESOLVED_STATUSES.includes(r.status) &&
    !(r.claims || []).some(c => c.status !== "DECLINED")
  );
}
function addReport(report){
  const saved = getSavedReports();
  saved.unshift(report);
  saveSavedReports(saved);
}
function updateReport(id, patch){
  const saved = getSavedReports();
  const idx = saved.findIndex(r => r.id === id);
  const previous = idx >= 0 ? saved[idx] : DEMO_REPORTS.find(r => r.id === id);
  if(!previous) return null;
  const updated = {...previous, ...patch};
  if(idx >= 0){
    saved[idx] = updated;
  }else{
    // Demo rows get copied into local storage the first time they're edited.
    saved.unshift(updated);
  }
  saveSavedReports(saved);
  if(patch.status === "RECOVERED" && updated.email){
    addCreditsTo(updated.email, CREDIT_AWARD_ON_RETURN);
  }
  return updated;
}
function setReportStatus(id, status){ return updateReport(id, {status}); }

/* ---------- item/claim status transitions (admin-driven) ---------- */
/* Moves a report's item status forward/branching per ITEM_STATUS_FLOW.
   Does not touch any attached claim — use advanceClaimStatus for that. */
function advanceItemStatus(id, nextStatus){
  return updateReport(id, {status: nextStatus});
}
/* Moves ONE claim (by id) on a report forward per CLAIM_STATUS_FLOW, and
   cascades the parallel item status so admin and reporter always see one
   consistent picture instead of two lifecycles drifting out of sync:
     APPROVED           → item VERIFICATION_APPROVED, and every other
                           still-active claim on the same report is
                           auto-declined — approving one claim IS choosing
                           the best owner among however many people said
                           "I think this is mine".
     DECLINED           → if no other active claim remains, the item drops
                           back into the pool at MATCH_PENDING; otherwise
                           it stays put while the remaining claim(s) are
                           reviewed.
     READY_FOR_PICKUP    → item READY_FOR_PICKUP
     COMPLETED           → item RECOVERED (also awards finder credits)
   Returns {report: <updated report>, claim: <the claim that was acted on>}
   so the caller can diff claims before/after to fire notifications. */
function advanceClaimStatus(id, claimId, nextClaimStatus){
  const saved = getSavedReports();
  const idx = saved.findIndex(r => r.id === id);
  const previous = idx >= 0 ? saved[idx] : DEMO_REPORTS.find(r => r.id === id);
  if(!previous || !previous.claims || !previous.claims.length) return null;

  let claims = previous.claims.map(c => c.id === claimId ? {...c, status: nextClaimStatus} : c);
  const patch = {claims};

  if(nextClaimStatus === "APPROVED"){
    claims = claims.map(c =>
      c.id === claimId ? c :
      ["SUBMITTED","UNDER_REVIEW","MORE_INFO_REQUESTED"].includes(c.status) ? {...c, status:"DECLINED"} : c
    );
    patch.claims = claims;
    patch.status = "VERIFICATION_APPROVED";
  }else if(nextClaimStatus === "DECLINED"){
    const stillActive = claims.some(c => c.id !== claimId && c.status !== "DECLINED");
    if(!stillActive) patch.status = "MATCH_PENDING";
  }else if(nextClaimStatus === "READY_FOR_PICKUP"){
    patch.status = "READY_FOR_PICKUP";
  }else if(nextClaimStatus === "COMPLETED"){
    patch.status = "RECOVERED";
  }

  const updated = updateReport(id, patch);
  return updated ? {report: updated, claim: updated.claims.find(c => c.id === claimId)} : null;
}
function similarity(a, b){
  const A = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const B = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
  let common = 0; A.forEach(x => { if(B.has(x)) common++; });
  return common / Math.max(1, Math.min(A.size, B.size));
}

/* ---------- notification center ---------- */
/* One flat list in localStorage, each row tagged with the recipient's
   email. Fired whenever admin advances an item's or a claim's status
   (see admin.js) and whenever a claim is submitted on someone's found
   item (see discover.js), so both the reporter and any claimant always
   know when something they're involved in has moved. */
STORE.notifications = "quadLockerNotifications";
function getNotifications(){ return readJSON(STORE.notifications, []); }
function saveNotifications(list){ writeJSON(STORE.notifications, list); }
function addNotification({email, message, reportId}){
  email = (email || "").trim().toLowerCase();
  if(!email || !message) return;
  const list = getNotifications();
  list.unshift({id: Date.now() + Math.random(), email, message, reportId, createdAt: Date.now(), read: false});
  saveNotifications(list);
}
function myNotifications(email){
  email = (email || "").trim().toLowerCase();
  return getNotifications().filter(n => n.email === email);
}
function unreadNotificationCount(email){
  return myNotifications(email).filter(n => !n.read).length;
}
function markNotificationRead(id){
  const list = getNotifications();
  const idx = list.findIndex(n => n.id === id);
  if(idx < 0) return;
  list[idx].read = true;
  saveNotifications(list);
}
function markAllNotificationsRead(email){
  email = (email || "").trim().toLowerCase();
  const list = getNotifications();
  let changed = false;
  list.forEach(n => { if(n.email === email && !n.read){ n.read = true; changed = true; } });
  if(changed) saveNotifications(list);
}
function timeAgo(ts){
  const mins = Math.floor((Date.now() - ts) / 60000);
  if(mins < 1) return "just now";
  if(mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if(hrs < 24) return hrs + "h ago";
  return Math.floor(hrs / 24) + "d ago";
}

function renderNotifCenter(user){
  const wrap = document.getElementById("notifWrap");
  if(!wrap) return;
  if(!user){ wrap.hidden = true; return; }
  wrap.hidden = false;
  const badge = document.getElementById("notifBadge");
  if(!badge) return;
  const count = unreadNotificationCount(user.email);
  badge.textContent = count > 9 ? "9+" : String(count);
  badge.hidden = count === 0;
}
function renderNotifList(user){
  const list = document.getElementById("notifList");
  if(!list || !user) return;
  const items = myNotifications(user.email);
  list.innerHTML = items.length ? items.map(n => `
    <button type="button" class="notif-item ${n.read ? "" : "unread"}" data-id="${n.id}">
      <span>${escapeHtml(n.message)}</span>
      <small>${timeAgo(n.createdAt)}</small>
    </button>
  `).join("") : '<div class="notif-empty">No notifications yet.</div>';
}
function wireNotifCenter(){
  const wrap = document.getElementById("notifWrap");
  const bell = document.getElementById("notifBell");
  const panel = document.getElementById("notifPanel");
  if(!wrap || !bell || !panel) return;

  bell.addEventListener("click", () => {
    const opening = !panel.classList.contains("open");
    panel.classList.toggle("open", opening);
    bell.setAttribute("aria-expanded", String(opening));
    if(opening) renderNotifList(getCurrentUser());
  });
  document.getElementById("notifMarkAllBtn")?.addEventListener("click", () => {
    const user = getCurrentUser();
    if(!user) return;
    markAllNotificationsRead(user.email);
    renderNotifCenter(user);
    renderNotifList(user);
  });
  document.getElementById("notifList")?.addEventListener("click", e => {
    const item = e.target.closest(".notif-item");
    if(!item) return;
    markNotificationRead(Number(item.dataset.id) || item.dataset.id);
    const user = getCurrentUser();
    renderNotifCenter(user);
    window.location.href = user?.isAdmin ? "admin.html" : "profile.html";
  });
  document.addEventListener("click", e => {
    if(!panel.classList.contains("open")) return;
    if(wrap.contains(e.target)) return;
    panel.classList.remove("open");
    bell.setAttribute("aria-expanded", "false");
  });
  document.addEventListener("keydown", e => {
    if(e.key === "Escape" && panel.classList.contains("open")){
      panel.classList.remove("open");
      bell.setAttribute("aria-expanded", "false");
    }
  });
}

/* ---------- toast ---------- */
function showToast(msg){
  const t = document.getElementById("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
}

/* ---------- nav / header wiring (runs on every page) ---------- */
function initNav(){
  ensureSeedAdmin();
  const user = getCurrentUser();
  const isAdmin = Boolean(user?.isAdmin);
  const currentPage = document.body.dataset.page || "";

  document.querySelectorAll(".nav-link, .dock a").forEach(link => {
    link.classList.toggle("active", link.dataset.page === currentPage);
  });

  const adminLinks = document.querySelectorAll('[data-page="admin"]');
  adminLinks.forEach(el => { el.hidden = !isAdmin; if(el.style) el.style.display = isAdmin ? "" : "none"; });

  const loginLink = document.getElementById("loginLink");
  const registerLink = document.getElementById("registerLink");
  const userChip = document.getElementById("userChip");

  if(user){
    if(loginLink) loginLink.hidden = true;
    if(registerLink) registerLink.hidden = true;
    if(userChip){
      userChip.hidden = false;
      const initials = user.name ? user.name.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join("") : "SU";
      const avatarEl = document.getElementById("userChipAvatar");
      const nameEl = document.getElementById("userChipName");
      if(avatarEl) avatarEl.textContent = initials || "SU";
      if(nameEl) nameEl.textContent = user.name || user.email;
      const logoutBtn = document.getElementById("logoutBtn");
      if(logoutBtn) logoutBtn.onclick = logoutUser;
    }
  }else{
    if(loginLink) loginLink.hidden = false;
    if(registerLink) registerLink.hidden = false;
    if(userChip) userChip.hidden = true;
  }

  // Guard admin/profile/report pages from unauthenticated or non-admin access.
  // A report submitted while signed out has no owner email, so it can never
  // show up in anyone's "My Reports" — requiring sign-in first keeps every
  // report attributable and visible to its owner.
  if(currentPage === "admin" && !isAdmin){
    window.location.href = user ? "index.html" : "login.html";
    return;
  }
  if(currentPage === "profile" && !user){
    sessionStorage.setItem(REDIRECT_KEY, "profile.html");
    window.location.href = "login.html";
    return;
  }
  if(currentPage === "report" && !user){
    sessionStorage.setItem(REDIRECT_KEY, "report.html");
    showToast("Please log in to submit a report.");
    setTimeout(() => { window.location.href = "login.html"; }, 500);
    return;
  }

  const adminBanner = document.getElementById("adminEmailLabel");
  if(adminBanner) adminBanner.textContent = isAdmin ? `${user.email} • ADMIN` : "Not signed in";

  renderNotifCenter(user);
  wireNotifCenter();
  wireMenuToggle();
}

function wireMenuToggle(){
  const toggle = document.getElementById("menuToggle");
  const nav = document.getElementById("mainNav");
  if(!toggle || !nav) return;
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
  nav.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
    });
  });
  document.addEventListener("click", e => {
    if(!nav.classList.contains("open")) return;
    if(nav.contains(e.target) || toggle.contains(e.target)) return;
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  });
  document.addEventListener("keydown", e => {
    if(e.key === "Escape" && nav.classList.contains("open")){
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.focus();
    }
  });
}

/* Live character counter — removes any minimum-length gate, keeps a maximum. */
function wireCharCount(inputId, counterId, max){
  const input = document.getElementById(inputId);
  const counter = document.getElementById(counterId);
  if(!input || !counter) return;
  const update = () => {
    const len = input.value.length;
    counter.textContent = `${len} / ${max}`;
    counter.classList.toggle("near-limit", len >= max * 0.9);
  };
  input.addEventListener("input", update);
  update();
}

document.addEventListener("DOMContentLoaded", initNav);

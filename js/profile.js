/* Profile page — user dashboard: credits, badges, stats, editable identity, my reports. */
let reportFilter = "all";

function renderProfileDashboard(){
  const user = getCurrentUser();
  if(!user) return;

  document.getElementById("profileUserName").textContent = user.name || "Student User";
  document.getElementById("profileUserEmail").textContent = user.isAdmin ? "Admin • Campus account" : "Student • Campus account";
  document.getElementById("editName").value = user.name || "";
  document.getElementById("editEmail").value = user.email || "";

  const initials = (user.name || "SU").split(/\s+/).filter(Boolean).slice(0,2).map(w => w[0].toUpperCase()).join("") || "SU";
  document.getElementById("profileAvatar").textContent = initials;

  const credits = user.credits || 0;
  document.getElementById("creditNumber").textContent = credits;

  const tiers = [50, 100, 200];
  const nextTier = tiers.find(t => credits < t);
  document.getElementById("creditNextLabel").textContent = nextTier
    ? `Next badge at ${nextTier} credits`
    : "All badges unlocked!";
  const pct = nextTier ? Math.min(100, (credits / nextTier) * 100) : 100;
  document.getElementById("creditMeter").style.width = pct + "%";

  document.getElementById("badgeSamaritan").classList.toggle("locked", credits < 50);
  document.getElementById("badgeHero").classList.toggle("locked", credits < 100);
  document.getElementById("badgeCert").classList.toggle("locked", credits < 200);

  const mine = getReports().filter(r => (r.email || "").toLowerCase() === user.email.toLowerCase());
  document.getElementById("statTotalReports").textContent = mine.length;
  document.getElementById("statFoundReports").textContent = mine.filter(r => r.type === "found").length;
  document.getElementById("statReturnedReports").textContent = mine.filter(r => r.status === "RECOVERED").length;

  renderMyReports();
}

/* Reports this user should see in "My Reports": the ones they filed
   themselves (as finder/loser), plus any item they've submitted an
   ownership claim on — even though that report was originally filed by
   someone else. A report can carry more than one claim now (see
   js/status.js), so a claimant entry also carries the specific claim
   object that belongs to this viewer, not the whole claims array. */
function getMyReportEntries(user){
  const email = user.email.toLowerCase();
  const reports = getReports();

  const owned = reports
    .filter(r => (r.email || "").toLowerCase() === email)
    .map(r => ({...r, viewerRole: "owner"}));

  const claimed = reports
    .filter(r => (r.email || "").toLowerCase() !== email)
    .flatMap(r => (r.claims || [])
      .filter(c => (c.email || "").toLowerCase() === email)
      .map(c => ({...r, viewerRole: "claimant", viewerClaim: c}))
    );

  return [...claimed, ...owned];
}

function renderMyReports(){
  const list = document.getElementById("myReportsList");
  const count = document.getElementById("myReportsCount");
  const user = getCurrentUser();
  if(!list || !user) return;

  let mine = getMyReportEntries(user);
  if(reportFilter !== "all") mine = mine.filter(r => r.type === reportFilter);

  if(count) count.textContent = `${mine.length} ${mine.length === 1 ? "report" : "reports"}`;

  list.innerHTML = mine.length ? mine.map(r => {
    const isClaimant = r.viewerRole === "claimant";
    const typeLabel = isClaimant ? "MY CLAIM" : escapeHtml((r.type || "report").toUpperCase());
    const bodyText = isClaimant
      ? `Your claim: ${escapeHtml(r.viewerClaim?.detail || "")} — ${escapeHtml(r.viewerClaim?.description || "")}`
      : escapeHtml(r.desc || "No description provided.");
    // The reporter sees the item's own lifecycle; a claimant sees the
    // claim's lifecycle for the specific claim they submitted — same
    // steppers the admin console uses, with the step labels shown (not
    // just dots) so it's clear what stage each item/claim is actually at.
    const stepper = isClaimant
      ? renderClaimStatusStepper(r.viewerClaim?.status || "SUBMITTED")
      : renderItemStatusStepper(r.status);
    const badge = isClaimant ? statusBadgeHtml(r.viewerClaim?.status, "claim") : statusBadgeHtml(r.status, "item");
    return `
    <article class="my-report-card">
      <div>
        <span class="report-type${isClaimant ? " role-claimant" : ""}">${typeLabel}</span> ${badge}
        <h3>${escapeHtml(r.name || "Untitled item")}</h3>
        <p>${bodyText}</p>
        ${stepper}
      </div>
      <div class="my-report-meta">
        <span>${escapeHtml(r.cat || "")}</span>
        <span>${escapeHtml(r.location || "Location not provided")}</span>
        <span>${escapeHtml(r.date || "Date not provided")}</span>
      </div>
    </article>
  `;
  }).join("") : '<div class="reports-empty"><strong>No reports yet.</strong><span>Your lost and found reports — and any ownership claims you submit — will appear here.</span></div>';
}

/* Pencil-icon edit toggle: fields start locked; the pencil unlocks them
   and reveals Save. Clicking it again while editing cancels and restores
   the saved values instead of submitting a half-made change. */
function setProfileEditing(on){
  const nameInput = document.getElementById("editName");
  const emailInput = document.getElementById("editEmail");
  const saveBtn = document.getElementById("saveProfileBtn");
  const toggleBtn = document.getElementById("editToggleBtn");

  nameInput.disabled = !on;
  emailInput.disabled = !on;
  saveBtn.hidden = !on;
  toggleBtn.textContent = on ? "✕" : "✎";
  toggleBtn.setAttribute("aria-label", on ? "Cancel editing" : "Edit profile");
  toggleBtn.dataset.editing = on ? "true" : "false";

  if(on) nameInput.focus();
}

document.addEventListener("DOMContentLoaded", () => {
  renderProfileDashboard();

  document.getElementById("logoutBtn2")?.addEventListener("click", logoutUser);

  document.getElementById("editToggleBtn")?.addEventListener("click", () => {
    const turningOn = document.getElementById("editToggleBtn").dataset.editing !== "true";
    if(!turningOn){
      // Cancelling: restore the last-saved values before re-locking.
      const user = getCurrentUser();
      document.getElementById("editName").value = user.name || "";
      document.getElementById("editEmail").value = user.email || "";
    }
    setProfileEditing(turningOn);
  });

  document.getElementById("editProfileForm")?.addEventListener("submit", e => {
    e.preventDefault();
    const name = document.getElementById("editName").value.trim();
    const email = document.getElementById("editEmail").value.trim().toLowerCase();
    if(email !== getCurrentUser().email && findUser(email)){
      showToast("That email is already used by another account.");
      return;
    }
    updateCurrentUser({name, email});
    showToast("Profile updated.");
    setProfileEditing(false);
    renderProfileDashboard();
    initNav();
  });

  document.querySelectorAll("#myReportsFilters .filter-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#myReportsFilters .filter-tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      reportFilter = btn.dataset.filter;
      renderMyReports();
    });
  });
});

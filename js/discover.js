/* Discover page — the unclaimed-items feed and the ownership claim flow. */
let pendingClaimReport = null;

function toggleSearch(){
  const panel = document.getElementById("searchPanel");
  const opening = !panel.classList.contains("open");
  panel.classList.toggle("open", opening);
  if(opening) document.getElementById("searchInput").focus();
}
function closeSearch(){
  document.getElementById("searchPanel")?.classList.remove("open");
}

function renderDiscover(){
  const q = (document.getElementById("searchInput")?.value || "").toLowerCase().trim();
  const reports = getUnclaimedReports().filter(r =>
    !q || (r.name + " " + r.cat + " " + r.location).toLowerCase().includes(q)
  );
  const shell = document.getElementById("reelsShell");

  if(!reports.length){
    shell.innerHTML = '<div class="reel-empty"><div><h2>No unclaimed items.</h2><p>Everything matching your search has already been claimed or returned.</p></div></div>';
  }else{
    shell.innerHTML = reports.map(r => `
      <section class="reel">
        <article class="reel-card">
          <img src="${r.img}" alt="${escapeHtml(r.name)}">
          <div class="reel-private">🔒 PHOTO PROTECTED</div>
          <div class="reel-info">
            <div class="reel-category">${escapeHtml(r.cat).toUpperCase()}</div>
            <h3>${escapeHtml(r.name)}</h3>
            <div class="reel-meta">${escapeHtml(r.location)}<br>${escapeHtml(r.date)} • Photo details are hidden until verification.</div>
            <button class="reel-claim" onclick="openClaim(${r.id})">I THINK THIS IS MINE →</button>
          </div>
        </article>
      </section>
    `).join("");
  }

  // Replacing all the scroll-snap children via innerHTML can leave some
  // browsers holding onto a stale snap target from before the swap, which
  // makes the feed look "stuck" — it no longer responds to scroll/swipe
  // until something forces a fresh layout pass. Turning snapping off,
  // resetting the scroll position, then re-enabling it on the next frame
  // forces that fresh pass every time the feed re-renders (typing in
  // search, clearing search, claiming an item).
  shell.style.scrollSnapType = "none";
  shell.scrollTop = 0;
  requestAnimationFrame(() => { shell.style.scrollSnapType = ""; });
}

function openClaim(id){
  const user = getCurrentUser();
  if(!user){ window.location.href = "login.html"; return; }

  const report = getReports().find(r => r.id === id);
  if(!report) return;

  pendingClaimReport = report;
  document.getElementById("claimReportId").value = report.id;
  document.getElementById("claimItemName").textContent = report.name;
  document.getElementById("claimItemMeta").textContent = report.cat + " • " + report.location;
  document.getElementById("uniqueDetail").value = "";
  document.getElementById("claimDescription").value = "";
  document.getElementById("claimModal").classList.add("open");
  wireCharCount("claimDescription", "claimDescCount", 600);

  setTimeout(() => document.getElementById("uniqueDetail").focus(), 50);
}

function closeClaim(){
  document.getElementById("claimModal").classList.remove("open");
  pendingClaimReport = null;
}

function submitClaim(e){
  e.preventDefault();

  const report = pendingClaimReport;
  if(!report) return;

  // No minimum-length gate — any non-empty detail is accepted. Maximum length
  // is still enforced via the maxlength attributes on the fields themselves.
  const uniqueDetail = document.getElementById("uniqueDetail").value.trim();
  const description = document.getElementById("claimDescription").value.trim();

  if(!uniqueDetail){
    showToast("Enter a unique detail about the item.");
    document.getElementById("uniqueDetail").focus();
    return;
  }
  if(!description){
    showToast("Please add an ownership description.");
    document.getElementById("claimDescription").focus();
    return;
  }

  const user = getCurrentUser();
  const existingClaims = report.claims || [];
  if(existingClaims.some(c => c.email.toLowerCase() === user.email.toLowerCase() && c.status !== "DECLINED")){
    showToast("You already have an active claim on this item.");
    closeClaim();
    return;
  }

  const score = similarity(uniqueDetail + " " + description, report.desc);

  closeClaim();

  // Each claim is its own entry in the report's `claims` array so the
  // admin can see and compare every "I think this is mine" submitted on
  // the same found item — see js/status.js for both state machines.
  const newClaim = {
    id: Date.now(),
    status: "SUBMITTED",
    by: user.name,
    email: user.email,
    detail: uniqueDetail,
    description: description,
    matchScore: Math.round(score * 100),
    submittedAt: Date.now()
  };
  updateReport(report.id, {
    status: "VERIFICATION_PENDING",
    claims: [...existingClaims, newClaim]
  });

  if(report.email && report.email.toLowerCase() !== user.email.toLowerCase()){
    addNotification({
      email: report.email,
      message: `${user.name} submitted a claim on your found item "${report.name}".`,
      reportId: report.id
    });
  }

  document.getElementById("successTitle").textContent = "CLAIM SENT.";
  document.getElementById("successMessage").textContent = score >= 0.18
    ? "Strong detail match. Your claim has been sent to the admin for verification."
    : "Your claim has been sent to the admin. Ownership details will be reviewed.";
  document.getElementById("successStatus").textContent = "SUBMITTED";
  document.getElementById("successModal").classList.add("open");

  renderDiscover();
}

function closeSuccess(){ document.getElementById("successModal").classList.remove("open"); }

document.addEventListener("keydown", e => {
  if(e.key === "Escape"){ closeClaim(); closeSuccess(); closeSearch(); }
});
document.addEventListener("click", e => {
  const panel = document.getElementById("searchPanel");
  const trigger = document.querySelector(".search-trigger");
  if(!panel || !panel.classList.contains("open")) return;
  if(panel.contains(e.target) || trigger?.contains(e.target)) return;
  closeSearch();
});

document.addEventListener("DOMContentLoaded", renderDiscover);

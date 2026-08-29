/* Admin page — control room: every request students file (lost or found),
   filterable/searchable, with full status control and a side-by-side
   comparison of every claim submitted on a given found item.
   Item/claim status transitions are driven entirely by ITEM_STATUS_FLOW and
   CLAIM_STATUS_FLOW (js/status.js) so the buttons shown always match a
   legal next step in the flow — there's no way to jump statuses out of order. */
let statusFilter = "all";
let typeFilter = "all";
let activeDetailId = null;

function renderAdminStats(){
  const reports = getReports();
  const allClaims = reports.flatMap(r => r.claims || []);
  document.getElementById("statAllReports").textContent = reports.length;
  document.getElementById("statClaims").textContent = allClaims.filter(c => !["COMPLETED","DECLINED"].includes(c.status)).length;
  document.getElementById("statVerify").textContent = reports.filter(r => ["VERIFICATION_PENDING","VERIFICATION_APPROVED"].includes(r.status)).length;
  document.getElementById("statReturnedAdmin").textContent = reports.filter(r => r.status === "RECOVERED").length;
}

function renderAdmin(){
  renderAdminStats();

  const q = (document.getElementById("adminSearch")?.value || "").toLowerCase().trim();
  let reports = getReports();
  if(typeFilter !== "all") reports = reports.filter(r => r.type === typeFilter);
  if(statusFilter !== "all") reports = reports.filter(r => r.status === statusFilter);
  if(q) reports = reports.filter(r =>
    (r.name + " " + r.owner + " " + r.location + " " + r.cat + " " + (r.claims || []).map(c => c.by).join(" ")).toLowerCase().includes(q)
  );

  const rows = document.getElementById("adminRows");
  if(!reports.length){
    rows.innerHTML = `<tr><td colspan="7" class="admin-empty">No reports match this filter.</td></tr>`;
    return;
  }

  rows.innerHTML = reports.map(r => {
    const activeClaims = (r.claims || []).filter(c => !["COMPLETED","DECLINED"].includes(c.status));
    return `
    <tr>
      <td><img class="mini-img" src="${r.img}" alt=""></td>
      <td><span class="type-pill ${r.type}">${r.type === "lost" ? "LOST" : "FOUND"}</span></td>
      <td><b>${escapeHtml(r.name)}</b><br><small>${escapeHtml(r.cat)}</small></td>
      <td>${escapeHtml(r.owner)}</td>
      <td>${escapeHtml(r.location)}</td>
      <td>
        ${statusBadgeHtml(r.status, "item")}
        ${activeClaims.length ? `<br><small style="display:block;margin-top:5px;color:var(--blue)">🔔 ${activeClaims.length} active claim${activeClaims.length > 1 ? "s" : ""}</small>` : ""}
      </td>
      <td>
        <button class="mini-btn" type="button" onclick="openDetail(${r.id})">View</button>
      </td>
    </tr>
  `;
  }).join("");
}

function setStatusFilter(status){
  statusFilter = status;
  document.querySelectorAll("#statusTabs .status-tab").forEach(b => b.classList.toggle("active", b.dataset.status === status));
  renderAdmin();
  document.querySelector(".admin-table")?.scrollIntoView({behavior:"smooth", block:"start"});
}
function setTypeFilter(type){
  typeFilter = type;
  document.querySelectorAll("#typeTabs .status-tab").forEach(b => b.classList.toggle("active", b.dataset.type === type));
  renderAdmin();
}

/* Builds the "advance to..." buttons for whichever step(s) are legally
   next from the report's current item status (there can be more than one
   where the flow branches, e.g. Match pending → Verification pending OR
   Unclaimed). */
function renderItemActionButtons(report){
  const options = nextItemStatusOptions(report.status);
  if(!options.length) return '<p class="sub" style="margin:0">This item has reached the end of its lifecycle.</p>';
  return options.map(opt =>
    `<button class="mini-btn ${opt.key === "UNCLAIMED" ? "" : "blue"}" type="button" onclick="adminAdvanceItem('${opt.key}')">Mark ${escapeHtml(opt.label.toLowerCase())}</button>`
  ).join("");
}
function renderClaimActionButtons(claim){
  const options = nextClaimStatusOptions(claim.status);
  if(!options.length) return "";
  return options.map(opt => {
    const tone = opt.key === "DECLINED" ? "red" : opt.key === "APPROVED" || opt.key === "COMPLETED" ? "green" : "blue";
    return `<button class="mini-btn ${tone}" type="button" onclick="adminAdvanceClaim(${claim.id},'${opt.key}')">Mark ${escapeHtml(opt.label.toLowerCase())}</button>`;
  }).join("");
}

/* One card per claim so competing "I think this is mine" submissions on
   the same found item sit side by side — sorted by detail-match score so
   the strongest candidate is the first thing the admin sees when choosing
   the best owner. */
function renderClaimCard(claim){
  return `
    <div class="claim-card">
      <div class="claim-card-head">
        <b>${escapeHtml(claim.by)}</b>${claim.email ? `<small>&nbsp;(${escapeHtml(claim.email)})</small>` : ""}
        ${statusBadgeHtml(claim.status, "claim")}
      </div>
      <p class="claim-card-detail"><b>Unique detail:</b> ${escapeHtml(claim.detail || "")}</p>
      <p class="claim-card-desc">${escapeHtml(claim.description || "")}</p>
      <p class="claim-card-score">Detail match score: <b>${claim.matchScore ?? "—"}%</b></p>
      ${renderClaimStatusStepper(claim.status, {compact:true})}
      <div class="submit-row" style="justify-content:flex-start;flex-wrap:wrap;margin-top:6px">
        ${renderClaimActionButtons(claim) || '<span class="sub" style="margin:0">This claim has reached the end of its lifecycle.</span>'}
      </div>
    </div>
  `;
}

function openDetail(id){
  const report = getReports().find(r => r.id === id);
  if(!report) return;
  activeDetailId = id;

  document.getElementById("detailName").textContent = report.name;
  const typeEl = document.getElementById("detailType");
  typeEl.textContent = report.type === "lost" ? "LOST" : "FOUND";
  typeEl.className = "type-pill " + report.type;
  const statusEl = document.getElementById("detailStatus");
  statusEl.textContent = itemStatusLabel(report.status);
  statusEl.className = "status " + statusSlug(report.status);
  document.getElementById("detailItemStepper").innerHTML = renderItemStatusStepper(report.status);
  document.getElementById("detailPhoto").src = report.img;
  document.getElementById("detailPhoto").alt = report.name;
  document.getElementById("detailDesc").textContent = report.desc || "No description provided.";
  document.getElementById("detailCat").textContent = report.cat;
  document.getElementById("detailLocation").textContent = report.location;
  document.getElementById("detailDate").textContent = report.date;
  document.getElementById("detailOwner").textContent = report.owner + (report.email ? ` (${report.email})` : "");
  document.getElementById("detailItemActions").innerHTML = renderItemActionButtons(report);

  const claimsSection = document.getElementById("detailClaimsSection");
  const claims = report.claims || [];
  if(claims.length){
    claimsSection.style.display = "block";
    const sorted = [...claims].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    document.getElementById("detailClaimsList").innerHTML = sorted.map(renderClaimCard).join("");
  }else{
    claimsSection.style.display = "none";
  }

  document.getElementById("detailModal").classList.add("open");
}

function closeDetail(){
  document.getElementById("detailModal").classList.remove("open");
  activeDetailId = null;
}

function adminAdvanceItem(nextStatus){
  if(activeDetailId == null) return;
  const updated = advanceItemStatus(activeDetailId, nextStatus);
  if(updated?.email){
    addNotification({
      email: updated.email,
      message: `Your item "${updated.name}" is now ${itemStatusLabel(nextStatus)}.`,
      reportId: updated.id
    });
  }
  showToast("Item marked \u201c" + itemStatusLabel(nextStatus) + "\u201d.");
  renderAdmin();
  openDetail(activeDetailId);
}

function adminAdvanceClaim(claimId, nextStatus){
  if(activeDetailId == null) return;
  const before = getReports().find(r => r.id === activeDetailId);
  const beforeClaims = (before?.claims || []).map(c => ({id: c.id, status: c.status}));
  const beforeItemStatus = before?.status;

  const result = advanceClaimStatus(activeDetailId, claimId, nextStatus);
  const updated = result?.report;
  if(!updated) return;

  // Notify every claimant whose claim status actually changed — the one
  // the admin acted on, plus any siblings auto-declined when a claim is
  // approved (choosing the best owner among competing claims).
  (updated.claims || []).forEach(c => {
    const prior = beforeClaims.find(b => b.id === c.id);
    if(prior && prior.status !== c.status && c.email){
      addNotification({
        email: c.email,
        message: `Your claim on "${updated.name}" is now ${claimStatusLabel(c.status)}.`,
        reportId: updated.id
      });
    }
  });
  if(updated.status !== beforeItemStatus && updated.email){
    addNotification({
      email: updated.email,
      message: `Your item "${updated.name}" is now ${itemStatusLabel(updated.status)}.`,
      reportId: updated.id
    });
  }

  showToast("Claim marked \u201c" + claimStatusLabel(nextStatus) + "\u201d.");
  renderAdmin();
  openDetail(activeDetailId);
}

document.addEventListener("keydown", e => { if(e.key === "Escape") closeDetail(); });

document.addEventListener("DOMContentLoaded", () => {
  renderAdmin();

  document.getElementById("adminSearch")?.addEventListener("input", renderAdmin);
  document.getElementById("jumpClaimsBtn")?.addEventListener("click", () => setStatusFilter("VERIFICATION_PENDING"));

  document.querySelectorAll("#statusTabs .status-tab").forEach(btn => {
    btn.addEventListener("click", () => setStatusFilter(btn.dataset.status));
  });
  document.querySelectorAll("#typeTabs .status-tab").forEach(btn => {
    btn.addEventListener("click", () => setTypeFilter(btn.dataset.type));
  });
});

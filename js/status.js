/* ==========================================================================
   QUAD LOCKER — status.js
   Defines the two lifecycle state machines used across the app:

   ITEM STATUS (every report):
     REPORTED → IN_SECURE_STORAGE → MATCH_PENDING → VERIFICATION_PENDING
       → VERIFICATION_APPROVED → READY_FOR_PICKUP → RECOVERED
     Branch (nobody recovers it), from IN_SECURE_STORAGE or MATCH_PENDING:
       → UNCLAIMED → DONATED | RETURNED_TO_FINDER | INSTITUTIONAL_PROPERTY

   CLAIM STATUS (once a student submits an ownership claim on a report):
     SUBMITTED → UNDER_REVIEW → (MORE_INFO_REQUESTED ⇄ UNDER_REVIEW)
       → APPROVED | DECLINED → READY_FOR_PICKUP → COMPLETED

   Both admin.js (control room) and profile.js (My Reports) render status
   through the helpers here, so the reporter and the admin always see the
   exact same labels/stepper for a given item.
   ========================================================================== */

const ITEM_STATUS_FLOW = {
  REPORTED:               {label:"Reported",                next:["IN_SECURE_STORAGE"]},
  IN_SECURE_STORAGE:      {label:"In secure storage",        next:["MATCH_PENDING","UNCLAIMED"]},
  MATCH_PENDING:          {label:"Match pending",            next:["VERIFICATION_PENDING","UNCLAIMED"]},
  VERIFICATION_PENDING:   {label:"Verification pending",     next:["VERIFICATION_APPROVED"]},
  VERIFICATION_APPROVED:  {label:"Verification approved",    next:["READY_FOR_PICKUP"]},
  READY_FOR_PICKUP:       {label:"Ready for pickup",         next:["RECOVERED"]},
  RECOVERED:              {label:"Recovered",                next:[]},
  UNCLAIMED:              {label:"Unclaimed",                next:["DONATED","RETURNED_TO_FINDER","INSTITUTIONAL_PROPERTY"]},
  DONATED:                {label:"Donated",                  next:[]},
  RETURNED_TO_FINDER:     {label:"Returned to finder",       next:[]},
  INSTITUTIONAL_PROPERTY: {label:"Institutional property",   next:[]}
};
const ITEM_MAIN_SEQUENCE = ["REPORTED","IN_SECURE_STORAGE","MATCH_PENDING","VERIFICATION_PENDING","VERIFICATION_APPROVED","READY_FOR_PICKUP","RECOVERED"];
const ITEM_BRANCH_OUTCOMES = ["DONATED","RETURNED_TO_FINDER","INSTITUTIONAL_PROPERTY"];

const CLAIM_STATUS_FLOW = {
  SUBMITTED:            {label:"Submitted",             next:["UNDER_REVIEW"]},
  UNDER_REVIEW:         {label:"Under review",           next:["MORE_INFO_REQUESTED","APPROVED","DECLINED"]},
  MORE_INFO_REQUESTED:  {label:"More info requested",    next:["UNDER_REVIEW"]},
  APPROVED:             {label:"Approved",               next:["READY_FOR_PICKUP"]},
  DECLINED:             {label:"Declined",               next:[]},
  READY_FOR_PICKUP:     {label:"Ready for pickup",       next:["COMPLETED"]},
  COMPLETED:            {label:"Completed",              next:[]}
};
const CLAIM_MAIN_SEQUENCE = ["SUBMITTED","UNDER_REVIEW","APPROVED","READY_FOR_PICKUP","COMPLETED"];

function statusSlug(status){ return String(status || "").toLowerCase().replace(/_/g,"-"); }
function itemStatusLabel(status){ return ITEM_STATUS_FLOW[status]?.label || status; }
function claimStatusLabel(status){ return CLAIM_STATUS_FLOW[status]?.label || status; }

/* Small colored pill — used in the admin table and on My Reports cards. */
function statusBadgeHtml(status, kind){
  const label = kind === "claim" ? claimStatusLabel(status) : itemStatusLabel(status);
  const cls = (kind === "claim" ? "claim-status " : "status ") + statusSlug(status);
  return `<span class="${cls}">${escapeHtml(label)}</span>`;
}

/* Which statuses an admin can legally move a report/claim to right now. */
function nextItemStatusOptions(status){
  return (ITEM_STATUS_FLOW[status]?.next || []).map(key => ({key, label: ITEM_STATUS_FLOW[key].label}));
}
function nextClaimStatusOptions(status){
  return (CLAIM_STATUS_FLOW[status]?.next || []).map(key => ({key, label: CLAIM_STATUS_FLOW[key].label}));
}

/* ---------- stepper rendering ---------- */
function stepDots(keys, activeIdx, labelMap, opts){
  opts = opts || {};
  return keys.map((key, i) => {
    const state = i < activeIdx ? "done" : i === activeIdx ? "current" : "upcoming";
    const connector = i > 0 ? `<span class="status-connector ${i <= activeIdx ? "done" : ""}"></span>` : "";
    const labelHtml = opts.showLabels ? `<small>${escapeHtml(labelMap[key].label)}</small>` : "";
    return `${connector}<span class="status-step ${state}" title="${escapeHtml(labelMap[key].label)}"><span class="dot"></span>${labelHtml}</span>`;
  }).join("");
}

/* Full item stepper — used in the admin detail dialog (plenty of room for labels). */
function renderItemStatusStepper(status, opts){
  opts = opts || {};
  const showLabels = opts.compact ? false : true;
  if(ITEM_MAIN_SEQUENCE.includes(status)){
    const idx = ITEM_MAIN_SEQUENCE.indexOf(status);
    return `<div class="status-stepper">${stepDots(ITEM_MAIN_SEQUENCE, idx, ITEM_STATUS_FLOW, {showLabels})}</div>`;
  }
  // Branch path: the item left the main recovery line at Match pending.
  const chain = status === "UNCLAIMED" ? ["UNCLAIMED"] : ["UNCLAIMED", status];
  const keys = [...ITEM_MAIN_SEQUENCE.slice(0,3), ...chain];
  const idx = keys.length - 1;
  return `<div class="status-stepper branch">${stepDots(keys, idx, ITEM_STATUS_FLOW, {showLabels})}</div>`;
}

/* Full claim stepper — used in the admin detail dialog and on the
   claimant's own My Reports card. MORE_INFO_REQUESTED is shown as a note
   on the "Under review" step rather than its own branch, since it's a
   pause within review, not a forward step. DECLINED ends the chain early. */
function renderClaimStatusStepper(status, opts){
  opts = opts || {};
  const showLabels = opts.compact ? false : true;
  if(status === "DECLINED"){
    const keys = ["SUBMITTED","UNDER_REVIEW","DECLINED"];
    return `<div class="status-stepper declined">${stepDots(keys, 2, {...CLAIM_STATUS_FLOW, DECLINED:{label:"Declined"}}, {showLabels})}</div>`;
  }
  const displayStatus = status === "MORE_INFO_REQUESTED" ? "UNDER_REVIEW" : status;
  const idx = CLAIM_MAIN_SEQUENCE.indexOf(displayStatus);
  const note = status === "MORE_INFO_REQUESTED" ? '<div class="status-note">⚠ More info requested from claimant</div>' : "";
  return `<div class="status-stepper">${stepDots(CLAIM_MAIN_SEQUENCE, idx, CLAIM_STATUS_FLOW, {showLabels})}</div>${note}`;
}

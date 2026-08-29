/* Report page — lost/found submission form. */
let reportMode = "lost";

function switchReport(mode){
  reportMode = mode;
  document.getElementById("reportType").value = mode;
  document.getElementById("lostTab").classList.toggle("active", mode === "lost");
  document.getElementById("foundTab").classList.toggle("active", mode === "found");
  document.querySelector(".form-card").style.background = mode === "found" ? "#eaf4ff" : "#fff";
}

function submitReport(e){
  e.preventDefault();
  const user = getCurrentUser();
  const report = {
    id: Date.now(),
    name: document.getElementById("itemName").value.trim(),
    cat: document.getElementById("category").value,
    date: document.getElementById("itemDate").value,
    location: document.getElementById("location").value.trim(),
    desc: document.getElementById("description").value.trim(),
    owner: user ? user.name : "Current student",
    email: user ? user.email : "",
    type: reportMode,
    status: "REPORTED",
    img: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80"
  };
  addReport(report);
  showToast(reportMode === "found"
    ? "Request submitted successfully. Please hand the found item to the admin for verification."
    : "Request submitted successfully. Your lost-item report has been sent to the admin for matching.");
  e.target.reset();
  switchReport("lost");
  // Stay on the Report page — no redirect. A "found" report now exists as
  // a card on Discover for other students to claim; a "lost" report never
  // gets a Discover card (see getUnclaimedReports in common.js) since
  // there's no physical item for anyone else to claim.
}

document.addEventListener("DOMContentLoaded", () => {
  wireCharCount("description", "descCount", 800);
});

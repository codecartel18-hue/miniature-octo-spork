/* Home page — live counts computed from actual report data. */
document.addEventListener("DOMContentLoaded", () => {
  const reports = getReports();
  const open = reports.filter(r => !["RECOVERED","DONATED","RETURNED_TO_FINDER","INSTITUTIONAL_PROPERTY"].includes(r.status)).length;
  const verification = reports.filter(r => ["VERIFICATION_PENDING","VERIFICATION_APPROVED"].includes(r.status)).length;
  const recovered = reports.filter(r => r.status === "RECOVERED").length;
  document.getElementById("statOpen").textContent = open;
  document.getElementById("statVerification").textContent = verification;
  document.getElementById("statReturned").textContent = recovered;
});

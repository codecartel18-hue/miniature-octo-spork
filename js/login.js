/* Login page. */
document.addEventListener("DOMContentLoaded", () => {
  ensureSeedAdmin();

  const existing = getCurrentUser();
  if(existing){
    window.location.href = postLoginDestination(existing);
    return;
  }

  document.getElementById("loginForm").addEventListener("submit", e => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    const result = loginUser(email, password);
    if(!result.ok){
      showAuthFeedback("error", "Couldn't sign you in.", result.error);
      return;
    }

    showAuthFeedback("success", "Welcome back!", "Redirecting you now...");
    setTimeout(() => {
      window.location.href = postLoginDestination(result.user);
    }, 500);
  });
});

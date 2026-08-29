/* Register page. */
document.addEventListener("DOMContentLoaded", () => {
  const existing = getCurrentUser();
  if(existing){
    window.location.href = postLoginDestination(existing);
    return;
  }

  document.getElementById("registerForm").addEventListener("submit", e => {
    e.preventDefault();
    const name = document.getElementById("fullName").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value;
    const confirm = document.getElementById("confirmPassword").value;

    if(password !== confirm){
      showAuthFeedback("error", "Passwords don't match.", "Re-enter your password in both fields.");
      return;
    }

    const result = registerUser({name, email, password});
    if(!result.ok){
      showAuthFeedback("error", "Couldn't create your account.", result.error);
      return;
    }

    showAuthFeedback("success", result.user.isAdmin ? "Admin account created." : "Account created!", "Redirecting you now...");
    setTimeout(() => {
      window.location.href = postLoginDestination(result.user);
    }, 500);
  });
});

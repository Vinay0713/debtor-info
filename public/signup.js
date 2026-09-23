document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signupForm");
  const submitStatus = document.getElementById("submitStatus");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());

    if (data.password.length < 8) {
      submitStatus.textContent = "Password must be at least 8 characters.";
      submitStatus.className = "error";
      return;
    }
    if (data.password !== data.confirmPassword) {
      submitStatus.textContent = "Passwords do not match.";
      submitStatus.className = "error";
      return;
    }

    submitStatus.textContent = "Creating account...";
    submitStatus.className = "";

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Sign up failed.");

      window.location.href = "/";
    } catch (err) {
      submitStatus.textContent = err.message;
      submitStatus.className = "error";
    }
  });
});

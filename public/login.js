document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const submitStatus = document.getElementById("submitStatus");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());

    submitStatus.textContent = "Logging in...";
    submitStatus.className = "";

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Login failed.");

      window.location.href = "/";
    } catch (err) {
      submitStatus.textContent = err.message;
      submitStatus.className = "error";
    }
  });
});

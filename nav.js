(function () {
  const TABS = [
    { label: "Personal Info", href: "index.html", always: true },
    { label: "Employment", href: "employment.html", requires: "personalSubmitted" },
    { label: "Income Calculations", href: "income-calculations.html", requires: "employmentSubmitted" },
    { label: "Spouse & Other Member", href: "spouse-other-member.html", requires: "incomeCalculationsSubmitted" },
    { label: "Assets", href: "assets.html", requires: "spouseOtherMemberSubmitted" },
    { label: "Liabilities", href: "liabilities.html", requires: "assetsSubmitted" },
    { label: "Questionnaire", href: "questionnaire.html", requires: "liabilitiesSubmitted" },
    { label: "Income", href: "income.html", requires: "questionnaireSubmitted" },
    { label: "Expenses", href: "expenses.html", requires: "incomeSubmitted" },
    { label: "Documents", href: "documents.html", requires: "expensesSubmitted" },
    { label: "Summary", href: "summary.html", requires: "expensesSubmitted" },
  ];

  function currentPage() {
    const path = window.location.pathname.split("/").pop();
    return path === "" ? "index.html" : path;
  }

  function render(status, authInfo) {
    const container = document.getElementById("navPlaceholder");
    if (!container) return;

    const page = currentPage();
    const nav = document.createElement("nav");
    nav.className = "site-nav";

    TABS.forEach((tab) => {
      const enabled = tab.always || Boolean(status[tab.requires]);
      const isActive = page === tab.href;
      const el = document.createElement(enabled ? "a" : "span");

      if (enabled) {
        el.href = tab.href;
      } else {
        el.title = "Complete the previous step first";
      }

      el.textContent = tab.label;
      el.className = "nav-tab" + (isActive ? " active" : "") + (enabled ? "" : " disabled");
      nav.appendChild(el);
    });

    if (authInfo && authInfo.loggedIn) {
      const userInfo = document.createElement("span");
      userInfo.className = "nav-user";
      userInfo.textContent = authInfo.email;
      nav.appendChild(userInfo);

      const logoutBtn = document.createElement("button");
      logoutBtn.type = "button";
      logoutBtn.className = "nav-logout";
      logoutBtn.textContent = "Log Out";
      logoutBtn.addEventListener("click", async () => {
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } catch (err) {
          // Ignore network errors; redirect to login regardless.
        }
        window.location.href = "/login.html";
      });
      nav.appendChild(logoutBtn);
    }

    container.innerHTML = "";
    container.appendChild(nav);
  }

  async function refresh() {
    try {
      const [statusRes, meRes] = await Promise.all([fetch("/api/status"), fetch("/api/auth/me")]);
      const status = await statusRes.json();
      const authInfo = await meRes.json();
      render(status, authInfo);
    } catch (err) {
      render({ personalSubmitted: false, employmentSubmitted: false }, null);
    }
  }

  document.addEventListener("DOMContentLoaded", refresh);
  window.addEventListener("nav:refresh", refresh);
})();

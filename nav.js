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
    { label: "Summary", href: "summary.html", requires: "expensesSubmitted" },
  ];

  function currentPage() {
    const path = window.location.pathname.split("/").pop();
    return path === "" ? "index.html" : path;
  }

  function render(status) {
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

    container.innerHTML = "";
    container.appendChild(nav);
  }

  async function refresh() {
    try {
      const res = await fetch("/api/status");
      const status = await res.json();
      render(status);
    } catch (err) {
      render({ personalSubmitted: false, employmentSubmitted: false });
    }
  }

  document.addEventListener("DOMContentLoaded", refresh);
  window.addEventListener("nav:refresh", refresh);
})();

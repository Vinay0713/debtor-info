document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("personalForm");
  const maritalStatus = document.getElementById("maritalStatus");
  const spouseNameDiv = document.getElementById("spouseNameDiv");
  const numberOfDependents = document.getElementById("numberOfDependents");
  const ctbDiv = document.getElementById("ctbDiv");
  const childTaxBenefit = document.getElementById("childTaxBenefit");
  const ctbAmountDiv = document.getElementById("ctbAmountDiv");
  const ctbAmount = document.getElementById("ctbAmount");
  const submitStatus = document.getElementById("submitStatus");

  function toggleSpouseName() {
    const showSpouse =
        maritalStatus.value === "Married" ||
        maritalStatus.value === "Seperated" ||
        maritalStatus.value === "Common-Law";

    spouseNameDiv.style.display = showSpouse ? "block" : "none";
  }

  function toggleCtb() {
    const hasDependents = Number(numberOfDependents.value) > 0;
    ctbDiv.style.display = hasDependents ? "block" : "none";
    if (!hasDependents) {
      childTaxBenefit.value = "";
    }
    toggleCtbAmount();
  }

  function toggleCtbAmount() {
    const showAmount = ctbDiv.style.display !== "none" && childTaxBenefit.value === "Yes";
    ctbAmountDiv.style.display = showAmount ? "block" : "none";
    if (!showAmount) {
      ctbAmount.value = "";
    }
  }

  maritalStatus.addEventListener("change", toggleSpouseName);
  numberOfDependents.addEventListener("input", toggleCtb);
  childTaxBenefit.addEventListener("change", toggleCtbAmount);

  toggleSpouseName();
  toggleCtb();

  const bankruptcyMirrorFields = [
    ["firstName", "bankruptcyFirstName"],
    ["middleName", "bankruptcyMiddleName"],
    ["lastName", "bankruptcyLastName"],
    ["aliasFirstName", "bankruptcyAliasFirstName"],
    ["aliasLastName", "bankruptcyAliasLastName"],
    ["dateOfBirth", "bankruptcyDateOfBirth"],
  ];

  bankruptcyMirrorFields.forEach(([sourceName, targetName]) => {
    const source = form.querySelector(`[name="${sourceName}"]`);
    const target = form.querySelector(`[name="${targetName}"]`);
    const display = document.getElementById(`${targetName}Display`);
    const sync = () => {
      target.value = source.value;
      display.textContent = source.value;
    };
    source.addEventListener("input", sync);
    sync();
  });

  function num(value) {
    return parseFloat(value) || 0;
  }

  // Pushes the CTB Amount entered above into the Income tab's existing
  // "Child Tax Benefits" row (Applicant column), the same way Income
  // Calculations and Spouse & Other Member push their own computed amounts
  // into the Income record before the user necessarily reaches that page.
  async function pushCtbAmountToIncome() {
    if (childTaxBenefit.value !== "Yes" || !ctbAmount.value) return;

    const INCOME_ROWS = [
      "employmentIncome",
      "pensionAnnuities",
      "childSupport",
      "spousalSupport",
      "employmentInsurance",
      "socialAssistance",
      "selfEmploymentIncome",
      "rentalIncome",
      "universalChildCare",
      "childTaxBenefits",
      "other",
    ];
    const INCOME_COLUMNS = ["applicant", "spouse", "otherHousehold"];

    const dataRes = await fetch("/api/data");
    const currentData = await dataRes.json();
    const income = { ...(currentData.income || {}) };

    income.childTaxBenefits_applicant = num(ctbAmount.value).toFixed(2);

    let grandTotal = 0;
    INCOME_COLUMNS.forEach((column) => {
      let subtotal = 0;
      INCOME_ROWS.forEach((row) => {
        subtotal += num(income[`${row}_${column}`]);
      });
      income[`subtotal_${column}`] = subtotal.toFixed(2);
      grandTotal += subtotal;
    });
    income.totalCombinedIncome = grandTotal.toFixed(2);

    const incomeRes = await fetch("/api/income", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(income),
    });
    if (!incomeRes.ok) throw new Error("Request failed");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());

    submitStatus.textContent = "Submitting...";
    submitStatus.className = "";

    try {
      const res = await fetch("/api/personal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Request failed");

      await pushCtbAmountToIncome();

      submitStatus.textContent = "Saved. You can continue to Spouse & Other Member.";
      submitStatus.className = "success";
      window.dispatchEvent(new Event("nav:refresh"));
    } catch (err) {
      submitStatus.textContent = "Failed to save. Please try again.";
      submitStatus.className = "error";
    }
  });
});

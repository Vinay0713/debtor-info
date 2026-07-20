document.addEventListener("DOMContentLoaded", async () => {
    const allowed = await Gate.enforce(
        "incomeCalculationsSubmitted",
        "#pageContent",
        "Please submit Income Calculations first.",
        "income-calculations.html"
    );
    if (!allowed) return;

    function num(value) {
        return parseFloat(value) || 0;
    }

    const pageContent = document.getElementById("pageContent");
    const numberOfAdultsInput = document.getElementById("numberOfAdults");
    const numberOfDependentsInput = document.getElementById("numberOfDependents");
    const otherAdultsSection = document.getElementById("otherAdultsSection");
    const otherAdultsContainer = document.getElementById("otherAdultsContainer");
    const otherAdultTemplate = document.getElementById("otherAdultTemplate");
    const spouseSection = document.getElementById("spouseSection");

    let maritalStatus = "";

    try {
        const res = await fetch("/api/data");
        const data = await res.json();
        const personal = data.personal || {};

        numberOfDependentsInput.value = personal.numberOfDependents || "0";
        maritalStatus = personal.maritalStatus || "";

        if (maritalStatus === "Married" || maritalStatus === "Common-Law") {
            spouseSection.style.display = "";
        }
    } catch (err) {
        numberOfDependentsInput.value = "0";
    }

    function isMarriedOrCommonLaw() {
        return maritalStatus === "Married" || maritalStatus === "Common-Law";
    }

    function updateOtherAdultsVisibility() {
        const adults = parseInt(numberOfAdultsInput.value, 10) || 0;
        const threshold = isMarriedOrCommonLaw() ? 2 : 1;
        otherAdultsSection.style.display = adults > threshold ? "" : "none";
    }

    numberOfAdultsInput.addEventListener("input", updateOtherAdultsVisibility);
    updateOtherAdultsVisibility();

    function wireOtherAdultCard(card) {
        const select = card.querySelector(".earning-income-select");
        const incomeField = card.querySelector(".income-field");
        const apply = () => {
            incomeField.style.display = select.value === "Yes" ? "" : "none";
        };
        select.addEventListener("change", apply);
        apply();
    }

    document.getElementById("addOtherAdultBtn").addEventListener("click", () => {
        const clone = otherAdultTemplate.content.cloneNode(true);
        const card = clone.querySelector(".entry-card");
        const removeBtn = card.querySelector(".removeEntryBtn");
        removeBtn.addEventListener("click", () => card.remove());
        wireOtherAdultCard(card);
        otherAdultsContainer.prepend(clone);
    });

    const spouseEarningIncomeSelect = document.getElementById("spouseEarningIncome");
    const spouseIncomeField = document.getElementById("spouseIncomeField");
    spouseEarningIncomeSelect.addEventListener("change", () => {
        spouseIncomeField.style.display = spouseEarningIncomeSelect.value === "Yes" ? "" : "none";
    });

    const receivingChildSupportSelect = document.getElementById("receivingChildSupport");
    const childSupportAmountField = document.getElementById("childSupportAmountField");
    receivingChildSupportSelect.addEventListener("change", () => {
        childSupportAmountField.style.display = receivingChildSupportSelect.value === "Yes" ? "" : "none";
    });

    const receivingSpousalSupportSelect = document.getElementById("receivingSpousalSupport");
    const spousalSupportAmountField = document.getElementById("spousalSupportAmountField");
    receivingSpousalSupportSelect.addEventListener("change", () => {
        spousalSupportAmountField.style.display = receivingSpousalSupportSelect.value === "Yes" ? "" : "none";
    });

    function collectOtherAdults() {
        return Array.from(document.querySelectorAll("#otherAdultsContainer .entry-card")).map((card) => ({
            description: card.querySelector('[name="description"]').value,
            earningIncome: card.querySelector('[name="earningIncome"]').value,
            income: card.querySelector('[name="earningIncome"]').value === "Yes" ? card.querySelector('[name="income"]').value : "",
        }));
    }

    const submitBtn = document.getElementById("submitSomBtn");
    const submitStatus = document.getElementById("submitStatus");

    submitBtn.addEventListener("click", async () => {
        const otherAdults = collectOtherAdults();
        const otherAdultsTotal = otherAdults.reduce((sum, a) => sum + (a.earningIncome === "Yes" ? num(a.income) : 0), 0);

        const spouseEarning = isMarriedOrCommonLaw() && spouseEarningIncomeSelect.value === "Yes";
        const spouseIncomeAmount = spouseEarning ? num(document.getElementById("spouseIncome").value) : 0;

        const receivingChildSupport = receivingChildSupportSelect.value === "Yes";
        const childSupportAmount = receivingChildSupport ? num(document.getElementById("childSupportAmount").value) : 0;

        const receivingSpousalSupport = receivingSpousalSupportSelect.value === "Yes";
        const spousalSupportAmount = receivingSpousalSupport
            ? num(document.getElementById("spousalSupportAmount").value)
            : 0;

        const payload = {
            numberOfAdults: numberOfAdultsInput.value,
            numberOfDependents: numberOfDependentsInput.value,
            otherAdults,
            spouseEarningIncome: isMarriedOrCommonLaw() ? spouseEarningIncomeSelect.value : "",
            spouseIncome: spouseEarning ? document.getElementById("spouseIncome").value : "",
            receivingChildSupport: receivingChildSupportSelect.value,
            childSupportAmount: receivingChildSupport ? document.getElementById("childSupportAmount").value : "",
            receivingSpousalSupport: receivingSpousalSupportSelect.value,
            spousalSupportAmount: receivingSpousalSupport ? document.getElementById("spousalSupportAmount").value : "",
        };

        submitStatus.textContent = "Submitting...";
        submitStatus.className = "";

        try {
            const somRes = await fetch("/api/spouse-other-member", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!somRes.ok) throw new Error("Request failed");

            const dataRes = await fetch("/api/data");
            const currentData = await dataRes.json();
            const income = { ...(currentData.income || {}) };

            if (otherAdultsTotal > 0) {
                income.other_otherHousehold = otherAdultsTotal.toFixed(2);
                income.other_otherHouseholdDescription = "Other Adults in Household";
            }
            if (spouseEarning) {
                income.employmentIncome_spouse = spouseIncomeAmount.toFixed(2);
            }
            if (receivingChildSupport) {
                income.childSupport_applicant = childSupportAmount.toFixed(2);
            }
            if (receivingSpousalSupport) {
                income.spousalSupport_applicant = spousalSupportAmount.toFixed(2);
            }

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

            submitStatus.textContent = "Saved. Amounts pushed to Income. You can continue to Assets.";
            submitStatus.className = "success";
            window.dispatchEvent(new Event("nav:refresh"));
        } catch (err) {
            submitStatus.textContent = "Failed to save. Please try again.";
            submitStatus.className = "error";
        }
    });
});

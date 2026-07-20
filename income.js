document.addEventListener("DOMContentLoaded", async () => {
    const allowed = await Gate.enforce(
        "questionnaireSubmitted",
        "#pageContent",
        "Please submit the Questionnaire first.",
        "questionnaire.html"
    );
    if (!allowed) return;

    const COLUMNS = ["applicant", "spouse", "otherHousehold"];
    const ROWS = [
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

    const pageContent = document.getElementById("pageContent");

    function num(value) {
        return parseFloat(value) || 0;
    }

    function recalcAll() {
        let grandTotal = 0;

        COLUMNS.forEach((column) => {
            let subtotal = 0;
            ROWS.forEach((row) => {
                const field = document.querySelector(`[name="${row}_${column}"]`);
                if (field) subtotal += num(field.value);
            });
            document.getElementById(`subtotal_${column}`).textContent = subtotal.toFixed(2);
            grandTotal += subtotal;
        });

        document.getElementById("totalCombinedIncome").textContent = grandTotal.toFixed(2);
    }

    pageContent.addEventListener("input", recalcAll);

    // Pre-fill from any previously saved Income data, including totals pushed in
    // from the Income Calculations page, so the two pages stay in sync.
    try {
        const res = await fetch("/api/data");
        const data = await res.json();
        const savedIncome = data.income || {};
        Object.entries(savedIncome).forEach(([key, value]) => {
            const field = document.querySelector(`#pageContent [name="${key}"]`);
            if (field) field.value = value;
        });
    } catch (err) {
        // If the fetch fails, the form just starts blank.
    }

    recalcAll();

    function collectValues() {
        const data = {};
        document.querySelectorAll("#pageContent input").forEach((field) => {
            if (field.name) data[field.name] = field.value;
        });
        COLUMNS.forEach((column) => {
            data[`subtotal_${column}`] = document.getElementById(`subtotal_${column}`).textContent;
        });
        data.totalCombinedIncome = document.getElementById("totalCombinedIncome").textContent;
        return data;
    }

    const submitBtn = document.getElementById("submitIncomeBtn");
    const submitStatus = document.getElementById("submitStatus");

    submitBtn.addEventListener("click", async () => {
        const payload = collectValues();

        submitStatus.textContent = "Submitting...";
        submitStatus.className = "";

        try {
            const res = await fetch("/api/income", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error("Request failed");

            submitStatus.textContent = "Saved.";
            submitStatus.className = "success";
            window.dispatchEvent(new Event("nav:refresh"));
        } catch (err) {
            submitStatus.textContent = "Failed to save. Please try again.";
            submitStatus.className = "error";
        }
    });
});

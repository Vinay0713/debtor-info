document.addEventListener("DOMContentLoaded", async () => {
    const allowed = await Gate.enforce(
        "incomeSubmitted",
        "#pageContent",
        "Please submit Income Info first.",
        "income.html"
    );
    if (!allowed) return;

    const SECTIONS = [
        {
            key: "nonDiscretionary",
            rows: [
                "childSupportPayments",
                "spousalSupportPayments",
                "childCare",
                "medicalConditionExpenses",
                "finesPenaltiesCourt",
                "employmentConditionExpenses",
                "debtsStayFiled",
                "businessRelatedExpenses",
            ],
            otherArrayName: "otherExpenses",
        },
        {
            key: "housing",
            rows: [
                "housingRent",
                "housingHeatGas",
                "housingPropane",
                "housingTelephone",
                "housingPower",
                "housingCable",
                "housingWater",
                "housingFurniture",
                "housingHouseholdMaintenance",
            ],
            otherArrayName: "otherHousingExpenses",
        },
        {
            key: "personal",
            rows: [
                "personalSmoking",
                "personalAlcohol",
                "personalDining",
                "personalEntertainment",
                "personalGifts",
                "personalAllowance",
                "personalNewspaperMagazine",
                "personalChildClothesShoes",
            ],
            otherArrayName: "otherPersonalExpenses",
        },
        {
            key: "medical",
            rows: ["medicalPrescriptions", "medicalDental"],
            otherArrayName: "otherMedicalExpenses",
        },
        {
            key: "living",
            rows: ["livingFoodGrocery", "livingLaundryDryCleaning", "livingGroomingToiletries", "livingClothing"],
            otherArrayName: "otherLivingExpenses",
        },
        {
            key: "transportation",
            rows: ["transportationCarLeaseFinance", "transportationRepairMaintenanceGas", "transportationRepairMaintenance"],
            otherArrayName: "otherTransportationExpenses",
        },
        {
            key: "insurance",
            rows: ["insuranceVehicle", "insuranceHouse", "insuranceFurnitureContents", "insuranceLife"],
            otherArrayName: "otherInsuranceExpenses",
        },
        {
            key: "payments",
            rows: ["paymentsCP", "paymentsChurchDonation", "paymentsSettlementOnAssets", "paymentsToSecuredPayments"],
            otherArrayName: "otherPaymentsExpenses",
        },
    ];

    const pageContent = document.getElementById("pageContent");
    const otherExpenseTemplate = document.getElementById("otherExpenseTemplate");

    function num(value) {
        return parseFloat(value) || 0;
    }

    function wireAddOtherButton(section) {
        const btn = document.getElementById(`addOtherBtn_${section.key}`);
        const container = document.getElementById(`otherContainer_${section.key}`);
        if (!btn || !container) return;

        btn.addEventListener("click", () => {
            const clone = otherExpenseTemplate.content.cloneNode(true);
            const row = clone.querySelector(".other-expense-row");
            const removeBtn = row.querySelector(".removeEntryBtn");
            removeBtn.addEventListener("click", () => {
                row.remove();
                recalcAll();
            });
            container.prepend(clone);
            recalcAll();
        });
    }

    SECTIONS.forEach(wireAddOtherButton);

    function recalcSection(section) {
        let subtotal = 0;

        section.rows.forEach((row) => {
            const field = document.querySelector(`[name="${row}"]`);
            if (field) subtotal += num(field.value);
        });

        const container = document.getElementById(`otherContainer_${section.key}`);
        container.querySelectorAll(".other-expense-row").forEach((row) => {
            const amountField = row.querySelector('[name="otherAmount"]');
            if (amountField) subtotal += num(amountField.value);
        });

        document.getElementById(`subtotal_${section.key}`).textContent = subtotal.toFixed(2);
        return subtotal;
    }

    let latestIncomeTotal = 0;

    function recalcAll() {
        let allExpensesTotal = 0;
        SECTIONS.forEach((section) => {
            allExpensesTotal += recalcSection(section);
        });
        document.getElementById("allExpensesTotal").textContent = allExpensesTotal.toFixed(2);

        const surplus = latestIncomeTotal - allExpensesTotal;
        document.getElementById("surplusDeficit").textContent = surplus.toFixed(2);
        const surplusDeficitBox = document.getElementById("surplusDeficitBox");
        surplusDeficitBox.classList.toggle("negative", surplus < 0);
        surplusDeficitBox.classList.toggle("positive", surplus >= 0);
    }

    pageContent.addEventListener("input", recalcAll);

    try {
        const res = await fetch("/api/data");
        const data = await res.json();
        latestIncomeTotal = num(data.income && data.income.totalCombinedIncome);
        document.getElementById("incomeTotalDisplay").textContent = latestIncomeTotal.toFixed(2);
    } catch (err) {
        // If Income hasn't been submitted yet (or the check fails), Income Total stays 0.
    }

    recalcAll();

    function collectValues() {
        const data = {};

        SECTIONS.forEach((section) => {
            section.rows.forEach((row) => {
                const field = document.querySelector(`[name="${row}"]`);
                data[row] = field ? field.value : "";
            });
            data[`subtotal_${section.key}`] = document.getElementById(`subtotal_${section.key}`).textContent;

            const container = document.getElementById(`otherContainer_${section.key}`);
            data[section.otherArrayName] = Array.from(container.querySelectorAll(".other-expense-row")).map((row) => ({
                otherDescription: row.querySelector('[name="otherDescription"]').value,
                otherAmount: row.querySelector('[name="otherAmount"]').value,
            }));
        });

        data.allExpensesTotal = document.getElementById("allExpensesTotal").textContent;
        data.incomeTotal = document.getElementById("incomeTotalDisplay").textContent;
        data.surplusDeficit = document.getElementById("surplusDeficit").textContent;

        return data;
    }

    const submitBtn = document.getElementById("submitExpensesBtn");
    const submitStatus = document.getElementById("submitStatus");

    submitBtn.addEventListener("click", async () => {
        const payload = collectValues();

        submitStatus.textContent = "Submitting...";
        submitStatus.className = "";

        try {
            const res = await fetch("/api/expenses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error("Request failed");

            submitStatus.textContent = "Saved. You can continue to Income.";
            submitStatus.className = "success";
            window.dispatchEvent(new Event("nav:refresh"));
        } catch (err) {
            submitStatus.textContent = "Failed to save. Please try again.";
            submitStatus.className = "error";
        }
    });
});

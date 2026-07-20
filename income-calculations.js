document.addEventListener("DOMContentLoaded", async () => {
    const allowed = await Gate.enforce(
        "employmentSubmitted",
        "#pageContent",
        "Please submit Employment Info first.",
        "employment.html"
    );
    if (!allowed) return;

    function num(value) {
        return parseFloat(value) || 0;
    }

    function calcTotalIncome(net, deductionsTotal, frequency) {
        const n = num(net);
        const d = deductionsTotal || 0;
        switch (frequency) {
            case "Biweekly":
                return ((n + d) * 26) / 12;
            case "Weekly":
                return ((n + d) * 52) / 12;
            case "Semi-Monthly":
                return (n + d) * 2;
            case "Monthly":
                return n + d;
            default:
                return 0;
        }
    }

    function makeRemoveButton(onRemove) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "removeEntryBtn";
        btn.setAttribute("aria-label", "Remove entry");
        btn.textContent = "×";
        btn.addEventListener("click", onRemove);
        return btn;
    }

    function makeHeader(title, onRemove) {
        const header = document.createElement("div");
        header.className = "calc-card-header";
        const titleEl = document.createElement("span");
        titleEl.textContent = title;
        header.appendChild(titleEl);
        if (onRemove) {
            header.appendChild(makeRemoveButton(onRemove));
        }
        return header;
    }

    function makeYesNoSelect() {
        const select = document.createElement("select");
        ["", "No", "Yes"].forEach((opt) => {
            const option = document.createElement("option");
            option.value = opt;
            option.textContent = opt;
            select.appendChild(option);
        });
        return select;
    }

    function makeLabeledInput(labelText, input) {
        const label = document.createElement("label");
        label.textContent = `${labelText}:`;
        label.appendChild(input);
        return label;
    }

    // --- Employed calculator: payment frequency + net income + repeatable deductions ---
    function buildEmployedCard(title, onRemove) {
        const card = document.createElement("div");
        card.className = "calc-card";
        card.appendChild(makeHeader(title, onRemove));

        const frequencySelect = document.createElement("select");
        ["", "Biweekly", "Weekly", "Monthly", "Semi-Monthly"].forEach((opt) => {
            const option = document.createElement("option");
            option.value = opt;
            option.textContent = opt;
            frequencySelect.appendChild(option);
        });
        card.appendChild(makeLabeledInput("Payment Frequency", frequencySelect));

        const netInput = document.createElement("input");
        netInput.type = "text";
        card.appendChild(makeLabeledInput("Net Income", netInput));

        const deductionsWrap = document.createElement("div");
        deductionsWrap.className = "deductions-wrap";
        const deductionsHeading = document.createElement("div");
        deductionsHeading.className = "deductions-heading";
        deductionsHeading.textContent = "Any RRSP, garnishment, advance deductions to add back:";
        deductionsWrap.appendChild(deductionsHeading);
        const deductionsList = document.createElement("div");
        deductionsList.className = "deductions-list";
        deductionsWrap.appendChild(deductionsList);
        const addDeductionBtn = document.createElement("button");
        addDeductionBtn.type = "button";
        addDeductionBtn.className = "addOtherBtn";
        addDeductionBtn.textContent = "Add Deduction";
        deductionsWrap.appendChild(addDeductionBtn);
        card.appendChild(deductionsWrap);

        const totalLine = document.createElement("p");
        totalLine.className = "computed-line";
        card.appendChild(totalLine);

        function getDeductions() {
            return Array.from(deductionsList.querySelectorAll(".deduction-row")).map((row) => ({
                description: row.querySelector(".deduction-desc").value,
                amount: row.querySelector(".deduction-amount").value,
            }));
        }

        function getDeductionsTotal() {
            return getDeductions().reduce((sum, d) => sum + num(d.amount), 0);
        }

        function getTotalIncome() {
            return calcTotalIncome(netInput.value, getDeductionsTotal(), frequencySelect.value);
        }

        function recalc() {
            totalLine.textContent = `Total Income: $${getTotalIncome().toFixed(2)}`;
        }

        function addDeductionRow() {
            const row = document.createElement("div");
            row.className = "deduction-row";
            const descInput = document.createElement("input");
            descInput.type = "text";
            descInput.placeholder = "Description";
            descInput.className = "deduction-desc";
            const amountInput = document.createElement("input");
            amountInput.type = "text";
            amountInput.placeholder = "Amount";
            amountInput.className = "deduction-amount";
            const removeRowBtn = makeRemoveButton(() => {
                row.remove();
                recalc();
            });
            row.appendChild(descInput);
            row.appendChild(amountInput);
            row.appendChild(removeRowBtn);
            deductionsList.appendChild(row);
            amountInput.addEventListener("input", recalc);
        }
        addDeductionBtn.addEventListener("click", addDeductionRow);

        netInput.addEventListener("input", recalc);
        frequencySelect.addEventListener("change", recalc);
        recalc();

        return {
            element: card,
            getData() {
                return {
                    paymentFrequency: frequencySelect.value,
                    netIncome: netInput.value,
                    deductions: getDeductions(),
                    totalIncome: getTotalIncome().toFixed(2),
                };
            },
            getTotalIncome,
        };
    }

    // --- Unemployed calculator: EI? -> Financial Assistance? -> Other Benefits? nested tree ---
    function buildUnemployedCard(title, onRemove) {
        const card = document.createElement("div");
        card.className = "calc-card";
        card.appendChild(makeHeader(title, onRemove));

        const eiSelect = makeYesNoSelect();
        card.appendChild(makeLabeledInput("Receiving EI?", eiSelect));

        const eiAmountInput = document.createElement("input");
        eiAmountInput.type = "text";
        const eiAmountLabel = makeLabeledInput("EI Amount", eiAmountInput);
        card.appendChild(eiAmountLabel);

        const faSelect = makeYesNoSelect();
        const faLabel = makeLabeledInput("Receiving Financial Assistance?", faSelect);
        card.appendChild(faLabel);

        const faProviderInput = document.createElement("input");
        faProviderInput.type = "text";
        const faProviderLabel = makeLabeledInput("Who is providing assistance", faProviderInput);
        card.appendChild(faProviderLabel);

        const obSelect = makeYesNoSelect();
        const obLabel = makeLabeledInput("Any Other Benefits Received?", obSelect);
        card.appendChild(obLabel);

        const obNameInput = document.createElement("input");
        obNameInput.type = "text";
        const obNameLabel = makeLabeledInput("Name of Benefit", obNameInput);
        card.appendChild(obNameLabel);

        const obAmountInput = document.createElement("input");
        obAmountInput.type = "text";
        const obAmountLabel = makeLabeledInput("Benefit Amount", obAmountInput);
        card.appendChild(obAmountLabel);

        function applyVisibility() {
            const ei = eiSelect.value === "Yes";
            eiAmountLabel.style.display = ei ? "" : "none";
            faLabel.style.display = ei ? "none" : "";

            const fa = !ei && faSelect.value === "Yes";
            faProviderLabel.style.display = fa ? "" : "none";
            obLabel.style.display = !ei && !fa ? "" : "none";

            const ob = !ei && !fa && obSelect.value === "Yes";
            obNameLabel.style.display = ob ? "" : "none";
            obAmountLabel.style.display = ob ? "" : "none";
        }

        eiSelect.addEventListener("change", applyVisibility);
        faSelect.addEventListener("change", applyVisibility);
        obSelect.addEventListener("change", applyVisibility);
        applyVisibility();

        function isOtherBenefitActive() {
            return eiSelect.value !== "Yes" && faSelect.value !== "Yes" && obSelect.value === "Yes";
        }

        return {
            element: card,
            getData() {
                const otherActive = isOtherBenefitActive();
                return {
                    receivingEI: eiSelect.value,
                    eiAmount: eiSelect.value === "Yes" ? eiAmountInput.value : "",
                    receivingFinancialAssistance: eiSelect.value === "Yes" ? "" : faSelect.value,
                    financialAssistanceProvider:
                        eiSelect.value !== "Yes" && faSelect.value === "Yes" ? faProviderInput.value : "",
                    receivingOtherBenefits: eiSelect.value !== "Yes" && faSelect.value !== "Yes" ? obSelect.value : "",
                    otherBenefitName: otherActive ? obNameInput.value : "",
                    otherBenefitAmount: otherActive ? obAmountInput.value : "",
                };
            },
            getEIAmount() {
                return eiSelect.value === "Yes" ? num(eiAmountInput.value) : 0;
            },
            getOtherBenefit() {
                if (isOtherBenefitActive()) {
                    return { name: obNameInput.value, amount: num(obAmountInput.value) };
                }
                return null;
            },
        };
    }

    // --- Retired calculator: repeatable Type of Pension + Monthly Income ---
    function buildRetiredCard(title, onRemove) {
        const card = document.createElement("div");
        card.className = "calc-card";
        card.appendChild(makeHeader(title, onRemove));

        const pensionsList = document.createElement("div");
        pensionsList.className = "pensions-list";
        card.appendChild(pensionsList);

        const addPensionBtn = document.createElement("button");
        addPensionBtn.type = "button";
        addPensionBtn.className = "addOtherBtn";
        addPensionBtn.textContent = "Add Type of Pension";
        card.appendChild(addPensionBtn);

        const totalLine = document.createElement("p");
        totalLine.className = "computed-line";
        card.appendChild(totalLine);

        function getPensions() {
            return Array.from(pensionsList.querySelectorAll(".pension-row")).map((row) => ({
                pensionType: row.querySelector(".pension-type").value,
                monthlyIncome: row.querySelector(".pension-amount").value,
            }));
        }

        function getTotal() {
            return getPensions().reduce((sum, p) => sum + num(p.monthlyIncome), 0);
        }

        function recalc() {
            totalLine.textContent = `Pension Monthly Income: $${getTotal().toFixed(2)}`;
        }

        function addPensionRow() {
            const row = document.createElement("div");
            row.className = "pension-row";
            const typeInput = document.createElement("input");
            typeInput.type = "text";
            typeInput.placeholder = "Type of Pension";
            typeInput.className = "pension-type";
            const amountInput = document.createElement("input");
            amountInput.type = "text";
            amountInput.placeholder = "Monthly Income";
            amountInput.className = "pension-amount";
            const removeRowBtn = makeRemoveButton(() => {
                row.remove();
                recalc();
            });
            row.appendChild(typeInput);
            row.appendChild(amountInput);
            row.appendChild(removeRowBtn);
            pensionsList.appendChild(row);
            amountInput.addEventListener("input", recalc);
        }
        addPensionBtn.addEventListener("click", addPensionRow);

        recalc();

        return {
            element: card,
            getData() {
                return { pensions: getPensions() };
            },
            getTotal,
        };
    }

    // --- Single-amount calculator: Disabled / Self-Employed / Benefits ---
    function buildSingleAmountCard(title, fieldLabel, fieldName, onRemove) {
        const card = document.createElement("div");
        card.className = "calc-card";
        card.appendChild(makeHeader(title, onRemove));

        const input = document.createElement("input");
        input.type = "text";
        card.appendChild(makeLabeledInput(fieldLabel, input));

        return {
            element: card,
            getData() {
                return { [fieldName]: input.value };
            },
            getAmount() {
                return num(input.value);
            },
        };
    }

    // --- Debtor section: one card per already-submitted Employment instance, non-removable ---
    const debtorEmployedCards = [];
    const debtorUnemployedCards = [];
    const debtorRetiredCards = [];
    const debtorDisabledCards = [];
    const debtorSelfEmployedCards = [];
    const debtorBenefitsCards = [];

    function renderDebtorCategory(container, instances, sectionTitle, buildOne, identifierField) {
        const built = [];
        if (!instances || instances.length === 0) return built;

        const heading = document.createElement("h3");
        heading.textContent = sectionTitle;
        container.appendChild(heading);

        instances.forEach((instance, index) => {
            const identifier =
                identifierField && instance[identifierField] ? instance[identifierField] : `Entry ${index + 1}`;
            const card = buildOne(`${sectionTitle} - ${identifier}`);
            container.appendChild(card.element);
            built.push(card);
        });

        return built;
    }

    let personalData = {};
    let spouseVisible = false;

    try {
        const res = await fetch("/api/data");
        const data = await res.json();
        const employmentData = data.employment || {};
        personalData = data.personal || {};

        debtorEmployedCards.push(
            ...renderDebtorCategory(
                document.getElementById("debtorEmployedContainer"),
                employmentData.employment,
                "Employed",
                (title) => buildEmployedCard(title, null),
                "employerName"
            )
        );
        debtorUnemployedCards.push(
            ...renderDebtorCategory(
                document.getElementById("debtorUnemployedContainer"),
                employmentData.unemployment,
                "Unemployed",
                (title) => buildUnemployedCard(title, null)
            )
        );
        debtorRetiredCards.push(
            ...renderDebtorCategory(
                document.getElementById("debtorRetiredContainer"),
                employmentData.retired,
                "Retired",
                (title) => buildRetiredCard(title, null),
                "pensionSource"
            )
        );
        debtorDisabledCards.push(
            ...renderDebtorCategory(
                document.getElementById("debtorDisabledContainer"),
                employmentData.disabled,
                "Disabled",
                (title) => buildSingleAmountCard(title, "Disability Monthly Income", "disabilityMonthlyIncome", null),
                "disabilityType"
            )
        );
        debtorSelfEmployedCards.push(
            ...renderDebtorCategory(
                document.getElementById("debtorSelfEmployedContainer"),
                employmentData.selfEmployed,
                "Self-Employed",
                (title) =>
                    buildSingleAmountCard(title, "Self Employment Monthly Income", "selfEmploymentMonthlyIncome", null),
                "businessName"
            )
        );
        debtorBenefitsCards.push(
            ...renderDebtorCategory(
                document.getElementById("debtorBenefitsContainer"),
                employmentData.benefits,
                "Benefits",
                (title) => buildSingleAmountCard(title, "Benefits Monthly Income", "benefitsMonthlyIncome", null),
                "benefitType"
            )
        );

        const anyDebtorInstances =
            debtorEmployedCards.length +
                debtorUnemployedCards.length +
                debtorRetiredCards.length +
                debtorDisabledCards.length +
                debtorSelfEmployedCards.length +
                debtorBenefitsCards.length >
            0;
        if (!anyDebtorInstances) {
            document.getElementById("debtorEmptyNotice").style.display = "";
        }

        if (personalData.maritalStatus === "Married" || personalData.maritalStatus === "Common-Law") {
            spouseVisible = true;
            document.getElementById("spouseSection").style.display = "";
        }
    } catch (err) {
        document.getElementById("debtorEmptyNotice").style.display = "";
    }

    // --- Spouse section: freely repeatable, same calculators as debtor ---
    const spouseEmployedCards = [];
    const spouseUnemployedCards = [];
    const spouseRetiredCards = [];
    const spouseBenefitsCards = [];

    function wireSpouseAddButton(buttonId, container, buildFn, cardsArray) {
        const btn = document.getElementById(buttonId);
        btn.addEventListener("click", () => {
            let card;
            const onRemove = () => {
                card.element.remove();
                const idx = cardsArray.indexOf(card);
                if (idx !== -1) cardsArray.splice(idx, 1);
                recalcPushSummary();
            };
            card = buildFn(onRemove);
            container.prepend(card.element);
            cardsArray.push(card);
            recalcPushSummary();
        });
    }

    wireSpouseAddButton(
        "addSpouseEmployedBtn",
        document.getElementById("spouseEmployedContainer"),
        (onRemove) => buildEmployedCard("Spouse - Employed", onRemove),
        spouseEmployedCards
    );
    wireSpouseAddButton(
        "addSpouseUnemployedBtn",
        document.getElementById("spouseUnemployedContainer"),
        (onRemove) => buildUnemployedCard("Spouse - Unemployed", onRemove),
        spouseUnemployedCards
    );
    wireSpouseAddButton(
        "addSpouseRetiredBtn",
        document.getElementById("spouseRetiredContainer"),
        (onRemove) => buildRetiredCard("Spouse - Retired", onRemove),
        spouseRetiredCards
    );
    wireSpouseAddButton(
        "addSpouseBenefitsBtn",
        document.getElementById("spouseBenefitsContainer"),
        (onRemove) => buildSingleAmountCard("Spouse - Benefits", "Benefits Monthly Income", "benefitsMonthlyIncome", onRemove),
        spouseBenefitsCards
    );

    // --- Aggregation ---
    function computeTotals() {
        const debtorEmploymentIncome = debtorEmployedCards.reduce((sum, c) => sum + c.getTotalIncome(), 0);
        const debtorEI = debtorUnemployedCards.reduce((sum, c) => sum + c.getEIAmount(), 0);
        const debtorOtherBenefitsList = debtorUnemployedCards.map((c) => c.getOtherBenefit()).filter(Boolean);
        const debtorOtherBenefits = debtorOtherBenefitsList.reduce((sum, b) => sum + b.amount, 0);
        const debtorPension = debtorRetiredCards.reduce((sum, c) => sum + c.getTotal(), 0);
        const debtorDisability = debtorDisabledCards.reduce((sum, c) => sum + c.getAmount(), 0);
        const debtorSelfEmployment = debtorSelfEmployedCards.reduce((sum, c) => sum + c.getAmount(), 0);
        const debtorBenefits = debtorBenefitsCards.reduce((sum, c) => sum + c.getAmount(), 0);

        const spouseEmploymentIncome = spouseEmployedCards.reduce((sum, c) => sum + c.getTotalIncome(), 0);
        const spouseEI = spouseUnemployedCards.reduce((sum, c) => sum + c.getEIAmount(), 0);
        const spouseOtherBenefitsList = spouseUnemployedCards.map((c) => c.getOtherBenefit()).filter(Boolean);
        const spouseOtherBenefits = spouseOtherBenefitsList.reduce((sum, b) => sum + b.amount, 0);
        const spousePension = spouseRetiredCards.reduce((sum, c) => sum + c.getTotal(), 0);
        const spouseBenefits = spouseBenefitsCards.reduce((sum, c) => sum + c.getAmount(), 0);

        return {
            debtorEmploymentIncome,
            debtorEI,
            debtorOtherBenefits,
            debtorOtherBenefitsList,
            debtorPension,
            debtorDisability,
            debtorSelfEmployment,
            debtorBenefits,
            spouseEmploymentIncome,
            spouseEI,
            spouseOtherBenefits,
            spouseOtherBenefitsList,
            spousePension,
            spouseBenefits,
        };
    }

    // Disability and Benefits have no dedicated row on the Income page, so both
    // fold into "Other (Specify)" alongside any named other-benefit entries.
    function buildOtherPush(otherBenefitsList, disabilityAmount, benefitsAmount) {
        let amount = 0;
        const descParts = [];

        otherBenefitsList.forEach((b) => {
            amount += b.amount;
            if (b.name) descParts.push(b.name);
        });

        if (disabilityAmount > 0) {
            amount += disabilityAmount;
            descParts.push("Disability");
        }

        if (benefitsAmount > 0) {
            amount += benefitsAmount;
            descParts.push("Benefits");
        }

        if (amount === 0 && descParts.length === 0) return null;

        return { amount, description: descParts.join(", ") };
    }

    function summaryRow(label, value) {
        const p = document.createElement("p");
        p.textContent = `${label}: $${value.toFixed(2)}`;
        return p;
    }

    function recalcPushSummary() {
        const t = computeTotals();
        const box = document.getElementById("pushSummaryBox");
        box.innerHTML = "";

        const heading = document.createElement("strong");
        heading.textContent = "Amounts that will be pushed into the Income page:";
        box.appendChild(heading);

        const debtorOther = buildOtherPush(t.debtorOtherBenefitsList, t.debtorDisability, t.debtorBenefits);

        box.appendChild(summaryRow("Employment Income (Applicant)", t.debtorEmploymentIncome));
        box.appendChild(summaryRow("Employment Insurance (Applicant)", t.debtorEI));
        box.appendChild(summaryRow("Pension/Annuities (Applicant)", t.debtorPension));
        box.appendChild(summaryRow("Self Employment Income (Applicant)", t.debtorSelfEmployment));
        box.appendChild(summaryRow("Other (Applicant)", debtorOther ? debtorOther.amount : 0));

        if (spouseVisible) {
            const spouseOther = buildOtherPush(t.spouseOtherBenefitsList, 0, t.spouseBenefits);

            box.appendChild(summaryRow("Employment Income (Spouse)", t.spouseEmploymentIncome));
            box.appendChild(summaryRow("Employment Insurance (Spouse)", t.spouseEI));
            box.appendChild(summaryRow("Pension/Annuities (Spouse)", t.spousePension));
            box.appendChild(summaryRow("Other (Spouse)", spouseOther ? spouseOther.amount : 0));
        }
    }

    document.getElementById("pageContent").addEventListener("input", recalcPushSummary);
    document.getElementById("pageContent").addEventListener("change", recalcPushSummary);
    recalcPushSummary();

    // --- Submit: save raw calculator data, then push aggregated totals into the existing Income record ---
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

    const submitBtn = document.getElementById("submitIncomeCalculationsBtn");
    const submitStatus = document.getElementById("submitStatus");

    submitBtn.addEventListener("click", async () => {
        const t = computeTotals();

        const payload = {
            debtor: {
                employed: debtorEmployedCards.map((c) => c.getData()),
                unemployed: debtorUnemployedCards.map((c) => c.getData()),
                retired: debtorRetiredCards.map((c) => c.getData()),
                disabled: debtorDisabledCards.map((c) => c.getData()),
                selfEmployed: debtorSelfEmployedCards.map((c) => c.getData()),
                benefits: debtorBenefitsCards.map((c) => c.getData()),
            },
            spouse: {
                employed: spouseEmployedCards.map((c) => c.getData()),
                unemployed: spouseUnemployedCards.map((c) => c.getData()),
                retired: spouseRetiredCards.map((c) => c.getData()),
                benefits: spouseBenefitsCards.map((c) => c.getData()),
            },
            totals: {
                debtorEmploymentIncome: t.debtorEmploymentIncome.toFixed(2),
                debtorEI: t.debtorEI.toFixed(2),
                debtorOtherBenefits: t.debtorOtherBenefits.toFixed(2),
                debtorPension: t.debtorPension.toFixed(2),
                debtorDisability: t.debtorDisability.toFixed(2),
                debtorSelfEmployment: t.debtorSelfEmployment.toFixed(2),
                debtorBenefits: t.debtorBenefits.toFixed(2),
                spouseEmploymentIncome: t.spouseEmploymentIncome.toFixed(2),
                spouseEI: t.spouseEI.toFixed(2),
                spouseOtherBenefits: t.spouseOtherBenefits.toFixed(2),
                spousePension: t.spousePension.toFixed(2),
                spouseBenefits: t.spouseBenefits.toFixed(2),
            },
        };

        submitStatus.textContent = "Submitting...";
        submitStatus.className = "";

        try {
            const calcRes = await fetch("/api/income-calculations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!calcRes.ok) throw new Error("Request failed");

            const dataRes = await fetch("/api/data");
            const currentData = await dataRes.json();
            const income = { ...(currentData.income || {}) };

            income.employmentIncome_applicant = t.debtorEmploymentIncome.toFixed(2);
            income.employmentInsurance_applicant = t.debtorEI.toFixed(2);
            income.pensionAnnuities_applicant = t.debtorPension.toFixed(2);
            income.selfEmploymentIncome_applicant = t.debtorSelfEmployment.toFixed(2);

            const debtorOther = buildOtherPush(t.debtorOtherBenefitsList, t.debtorDisability, t.debtorBenefits);
            if (debtorOther) {
                income.other_applicant = debtorOther.amount.toFixed(2);
                income.other_applicantDescription = debtorOther.description;
            }

            if (spouseVisible) {
                income.employmentIncome_spouse = t.spouseEmploymentIncome.toFixed(2);
                income.employmentInsurance_spouse = t.spouseEI.toFixed(2);
                income.pensionAnnuities_spouse = t.spousePension.toFixed(2);

                const spouseOther = buildOtherPush(t.spouseOtherBenefitsList, 0, t.spouseBenefits);
                if (spouseOther) {
                    income.other_spouse = spouseOther.amount.toFixed(2);
                    income.other_spouseDescription = spouseOther.description;
                }
            }

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

            submitStatus.textContent = "Saved. Totals pushed to Income. You can continue to Expenses.";
            submitStatus.className = "success";
            window.dispatchEvent(new Event("nav:refresh"));
        } catch (err) {
            submitStatus.textContent = "Failed to save. Please try again.";
            submitStatus.className = "error";
        }
    });
});

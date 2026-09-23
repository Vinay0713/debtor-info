document.addEventListener("DOMContentLoaded", async () => {
    const allowed = await Gate.enforce(
        "expensesSubmitted",
        "#pageContent",
        "Please submit Personal Info, Spouse & Other Member Info, Employment Info, Income Calculations, Assets Info, Liabilities Info, the Questionnaire, Income Info, and Expenses Info first.",
        "expenses.html"
    );
    if (!allowed) return;

    const {
        PERSONAL_FIELD_LABELS,
        EMPLOYMENT_CATEGORY_LABELS,
        EMPLOYMENT_FIELD_LABELS,
        ASSET_CATEGORY_LABELS,
        ASSET_FIELD_LABELS,
        BANKRUPTCY_EQUITY_FIELD_LABELS,
        LIABILITY_CATEGORY_LABELS,
        LIABILITY_FIELD_LABELS,
        QUESTIONNAIRE_FIELD_LABELS,
        INCOME_FIELD_LABELS,
        EXPENSE_SECTIONS,
        EXPENSE_OTHER_FIELD_LABELS,
        EXPENSE_SUMMARY_FIELD_LABELS,
        INCOME_CALC_CATEGORY_LABELS,
        INCOME_CALC_EMPLOYED_FIELD_LABELS,
        INCOME_CALC_DEDUCTION_FIELD_LABELS,
        INCOME_CALC_UNEMPLOYED_FIELD_LABELS,
        INCOME_CALC_PENSION_FIELD_LABELS,
        INCOME_CALC_DISABLED_FIELD_LABELS,
        INCOME_CALC_SELF_EMPLOYED_FIELD_LABELS,
        INCOME_CALC_BENEFITS_FIELD_LABELS,
        INCOME_CALC_TOTALS_LABELS,
        SOM_FIELD_LABELS,
        SOM_OTHER_ADULT_FIELD_LABELS,
    } = window.FieldLabels;

    function appendField(grid, label, value) {
        const field = document.createElement("div");
        field.className = "info-field";

        const labelEl = document.createElement("span");
        labelEl.className = "info-label";
        labelEl.textContent = label;

        const valueEl = document.createElement("span");
        valueEl.className = "info-value";
        valueEl.textContent = value;

        field.appendChild(labelEl);
        field.appendChild(valueEl);
        grid.appendChild(field);
    }

    function renderKeyValue(gridId, obj, labelMap) {
        const grid = document.getElementById(gridId);
        const entries = Object.entries(labelMap).filter(
            ([key]) => obj[key] !== undefined && obj[key] !== null && String(obj[key]).trim() !== ""
        );

        if (entries.length === 0) {
            const p = document.createElement("p");
            p.textContent = "None provided.";
            grid.appendChild(p);
            return;
        }

        entries.forEach(([key, label]) => appendField(grid, label, obj[key]));
    }

    function renderCategorySections(containerId, dataObj, categoryLabels, fieldLabels, emptyMessage) {
        const container = document.getElementById(containerId);
        let anyRendered = false;

        Object.entries(categoryLabels).forEach(([category, categoryLabel]) => {
            const entries = (dataObj && dataObj[category]) || [];
            if (entries.length === 0) return;

            anyRendered = true;

            const section = document.createElement("section");
            section.className = "entry-card";

            const header = document.createElement("div");
            header.className = "entry-header";
            const h3 = document.createElement("h3");
            h3.textContent = categoryLabel;
            header.appendChild(h3);
            section.appendChild(header);

            entries.forEach((entry, index) => {
                const subCard = document.createElement("div");
                subCard.className = "sub-card";

                const entryHeading = document.createElement("h4");
                entryHeading.textContent = `Entry ${index + 1}`;
                subCard.appendChild(entryHeading);

                const grid = document.createElement("div");
                grid.className = "info-grid";
                Object.entries(fieldLabels).forEach(([key, label]) => {
                    const value = entry[key];
                    if (value !== undefined && value !== null && String(value).trim() !== "") {
                        appendField(grid, label, value);
                    }
                });
                subCard.appendChild(grid);
                section.appendChild(subCard);
            });

            container.appendChild(section);
        });

        return anyRendered;
    }

    function renderAssets(assets) {
        const container = document.getElementById("assetsSections");
        const anyRendered = renderCategorySections(
            "assetsSections",
            assets,
            ASSET_CATEGORY_LABELS,
            ASSET_FIELD_LABELS
        );

        const bankruptcyEquityEntries = Object.entries(BANKRUPTCY_EQUITY_FIELD_LABELS).filter(([key]) => {
            const value = assets && assets[key];
            return value !== undefined && value !== null && String(value).trim() !== "";
        });
        const hasBankruptcyEquity = bankruptcyEquityEntries.length > 0;

        if (hasBankruptcyEquity) {
            const section = document.createElement("section");
            section.className = "entry-card";

            const header = document.createElement("div");
            header.className = "entry-header";
            const h3 = document.createElement("h3");
            h3.textContent = "Bankruptcy Equity (Assets)";
            header.appendChild(h3);
            section.appendChild(header);

            const grid = document.createElement("div");
            grid.className = "info-grid";
            bankruptcyEquityEntries.forEach(([key, label]) => appendField(grid, label, assets[key]));
            section.appendChild(grid);

            container.appendChild(section);
        }

        if (!anyRendered && !hasBankruptcyEquity) {
            const p = document.createElement("p");
            p.textContent = "No assets details submitted yet.";
            container.appendChild(p);
        }
    }

    function renderLiabilities(liabilities) {
        const container = document.getElementById("liabilitiesSections");
        const anyRendered = renderCategorySections(
            "liabilitiesSections",
            liabilities,
            LIABILITY_CATEGORY_LABELS,
            LIABILITY_FIELD_LABELS
        );

        if (!anyRendered) {
            const p = document.createElement("p");
            p.textContent = "No liabilities details submitted yet.";
            container.appendChild(p);
            return;
        }

        const entries = (liabilities && liabilities.liabilities) || [];
        const totals = entries.reduce(
            (acc, entry) => {
                const amount = parseFloat(entry.debtAmount) || 0;
                if (entry.debtSecurityType === "Secured") acc.secured += amount;
                else if (entry.debtSecurityType === "Unsecured") acc.unsecured += amount;
                return acc;
            },
            { secured: 0, unsecured: 0 }
        );

        const totalsRow = document.createElement("div");
        totalsRow.className = "totals-row";

        const securedBox = document.createElement("div");
        securedBox.className = "total-box";
        securedBox.textContent = `Total Secured Debt: $${totals.secured.toFixed(2)}`;

        const unsecuredBox = document.createElement("div");
        unsecuredBox.className = "total-box";
        unsecuredBox.textContent = `Total Unsecured Debt: $${totals.unsecured.toFixed(2)}`;

        totalsRow.appendChild(securedBox);
        totalsRow.appendChild(unsecuredBox);
        container.appendChild(totalsRow);
    }

    function renderExpenses(expenses) {
        const container = document.getElementById("expensesSections");
        let anyRendered = false;

        EXPENSE_SECTIONS.forEach((section) => {
            const rowEntries = section.rows.filter(([key]) => {
                const value = expenses && expenses[key];
                return value !== undefined && value !== null && String(value).trim() !== "";
            });
            const otherEntries = (expenses && expenses[section.otherArrayName]) || [];
            const subtotal = expenses && expenses[`subtotal_${section.key}`];
            const hasSubtotal = subtotal !== undefined && subtotal !== null && String(subtotal).trim() !== "";

            if (rowEntries.length === 0 && otherEntries.length === 0 && !hasSubtotal) return;

            anyRendered = true;

            const sectionEl = document.createElement("section");
            sectionEl.className = "entry-card";

            const header = document.createElement("div");
            header.className = "entry-header";
            const h3 = document.createElement("h3");
            h3.textContent = section.title;
            header.appendChild(h3);
            sectionEl.appendChild(header);

            const grid = document.createElement("div");
            grid.className = "info-grid";
            rowEntries.forEach(([key, label]) => appendField(grid, label, expenses[key]));
            sectionEl.appendChild(grid);

            otherEntries.forEach((entry, index) => {
                const subCard = document.createElement("div");
                subCard.className = "sub-card";

                const entryHeading = document.createElement("h4");
                entryHeading.textContent = `Other Entry ${index + 1}`;
                subCard.appendChild(entryHeading);

                const otherGrid = document.createElement("div");
                otherGrid.className = "info-grid";
                Object.entries(EXPENSE_OTHER_FIELD_LABELS).forEach(([key, label]) => {
                    const value = entry[key];
                    if (value !== undefined && value !== null && String(value).trim() !== "") {
                        appendField(otherGrid, label, value);
                    }
                });
                subCard.appendChild(otherGrid);
                sectionEl.appendChild(subCard);
            });

            if (hasSubtotal) {
                const totalsRow = document.createElement("div");
                totalsRow.className = "totals-row";
                const box = document.createElement("div");
                box.className = "total-box";
                box.textContent = `${section.subtotalLabel}: $${subtotal}`;
                totalsRow.appendChild(box);
                sectionEl.appendChild(totalsRow);
            }

            container.appendChild(sectionEl);
        });

        const summaryEntries = Object.entries(EXPENSE_SUMMARY_FIELD_LABELS).filter(([key]) => {
            const value = expenses && expenses[key];
            return value !== undefined && value !== null && String(value).trim() !== "";
        });

        if (summaryEntries.length > 0) {
            anyRendered = true;
            const sectionEl = document.createElement("section");
            sectionEl.className = "entry-card";

            const header = document.createElement("div");
            header.className = "entry-header";
            const h3 = document.createElement("h3");
            h3.textContent = "Expense Summary";
            header.appendChild(h3);
            sectionEl.appendChild(header);

            const totalsRow = document.createElement("div");
            totalsRow.className = "totals-row";
            summaryEntries.forEach(([key, label]) => {
                const box = document.createElement("div");
                box.className = "total-box";
                box.textContent = `${label}: $${expenses[key]}`;
                totalsRow.appendChild(box);
            });
            sectionEl.appendChild(totalsRow);

            container.appendChild(sectionEl);
        }

        if (!anyRendered) {
            const p = document.createElement("p");
            p.textContent = "No expenses details submitted yet.";
            container.appendChild(p);
        }
    }

    function appendInstanceFields(grid, category, entry) {
        if (category === "employed") {
            Object.entries(INCOME_CALC_EMPLOYED_FIELD_LABELS).forEach(([key, label]) => {
                const value = entry[key];
                if (value !== undefined && value !== null && String(value).trim() !== "") {
                    appendField(grid, label, value);
                }
            });
            (entry.deductions || []).forEach((deduction, i) => {
                Object.entries(INCOME_CALC_DEDUCTION_FIELD_LABELS).forEach(([key, label]) => {
                    const value = deduction[key];
                    if (value !== undefined && value !== null && String(value).trim() !== "") {
                        appendField(grid, `Deduction ${i + 1} - ${label}`, value);
                    }
                });
            });
        } else if (category === "unemployed") {
            Object.entries(INCOME_CALC_UNEMPLOYED_FIELD_LABELS).forEach(([key, label]) => {
                const value = entry[key];
                if (value !== undefined && value !== null && String(value).trim() !== "") {
                    appendField(grid, label, value);
                }
            });
        } else if (category === "retired") {
            (entry.pensions || []).forEach((pension, i) => {
                Object.entries(INCOME_CALC_PENSION_FIELD_LABELS).forEach(([key, label]) => {
                    const value = pension[key];
                    if (value !== undefined && value !== null && String(value).trim() !== "") {
                        appendField(grid, `Pension ${i + 1} - ${label}`, value);
                    }
                });
            });
        } else if (category === "disabled") {
            Object.entries(INCOME_CALC_DISABLED_FIELD_LABELS).forEach(([key, label]) => {
                const value = entry[key];
                if (value !== undefined && value !== null && String(value).trim() !== "") {
                    appendField(grid, label, value);
                }
            });
        } else if (category === "selfEmployed") {
            Object.entries(INCOME_CALC_SELF_EMPLOYED_FIELD_LABELS).forEach(([key, label]) => {
                const value = entry[key];
                if (value !== undefined && value !== null && String(value).trim() !== "") {
                    appendField(grid, label, value);
                }
            });
        } else if (category === "benefits") {
            Object.entries(INCOME_CALC_BENEFITS_FIELD_LABELS).forEach(([key, label]) => {
                const value = entry[key];
                if (value !== undefined && value !== null && String(value).trim() !== "") {
                    appendField(grid, label, value);
                }
            });
        }
    }

    function renderIncomeCalcPerson(container, personLabel, personData) {
        let anyRendered = false;

        Object.entries(INCOME_CALC_CATEGORY_LABELS).forEach(([category, categoryLabel]) => {
            const entries = (personData && personData[category]) || [];
            if (entries.length === 0) return;

            anyRendered = true;

            const section = document.createElement("section");
            section.className = "entry-card";

            const header = document.createElement("div");
            header.className = "entry-header";
            const h3 = document.createElement("h3");
            h3.textContent = `${personLabel} - ${categoryLabel}`;
            header.appendChild(h3);
            section.appendChild(header);

            entries.forEach((entry, index) => {
                const subCard = document.createElement("div");
                subCard.className = "sub-card";

                const entryHeading = document.createElement("h4");
                entryHeading.textContent = `Entry ${index + 1}`;
                subCard.appendChild(entryHeading);

                const grid = document.createElement("div");
                grid.className = "info-grid";
                appendInstanceFields(grid, category, entry);
                subCard.appendChild(grid);

                section.appendChild(subCard);
            });

            container.appendChild(section);
        });

        return anyRendered;
    }

    function renderIncomeCalculations(incomeCalculations) {
        const container = document.getElementById("incomeCalculationsSections");
        const debtorRendered = renderIncomeCalcPerson(container, "Debtor", incomeCalculations && incomeCalculations.debtor);
        const spouseRendered = renderIncomeCalcPerson(container, "Spouse", incomeCalculations && incomeCalculations.spouse);

        if (!debtorRendered && !spouseRendered) {
            const p = document.createElement("p");
            p.textContent = "No income calculation details submitted yet.";
            container.appendChild(p);
            return;
        }

        const totals = (incomeCalculations && incomeCalculations.totals) || {};
        const totalsEntries = Object.entries(INCOME_CALC_TOTALS_LABELS).filter(([key]) => {
            const value = totals[key];
            return value !== undefined && value !== null && String(value).trim() !== "";
        });

        if (totalsEntries.length > 0) {
            const section = document.createElement("section");
            section.className = "entry-card";

            const header = document.createElement("div");
            header.className = "entry-header";
            const h3 = document.createElement("h3");
            h3.textContent = "Computed Totals Pushed to Income";
            header.appendChild(h3);
            section.appendChild(header);

            const grid = document.createElement("div");
            grid.className = "info-grid";
            totalsEntries.forEach(([key, label]) => appendField(grid, label, `$${totals[key]}`));
            section.appendChild(grid);

            container.appendChild(section);
        }
    }

    function renderSpouseOtherMember(somData) {
        renderKeyValue("somGrid", somData || {}, SOM_FIELD_LABELS);

        const container = document.getElementById("somOtherAdultsSections");
        const otherAdults = (somData && somData.otherAdults) || [];

        otherAdults.forEach((adult, index) => {
            const subCard = document.createElement("div");
            subCard.className = "sub-card";

            const entryHeading = document.createElement("h4");
            entryHeading.textContent = `Other Adult ${index + 1}`;
            subCard.appendChild(entryHeading);

            const grid = document.createElement("div");
            grid.className = "info-grid";
            Object.entries(SOM_OTHER_ADULT_FIELD_LABELS).forEach(([key, label]) => {
                const value = adult[key];
                if (value !== undefined && value !== null && String(value).trim() !== "") {
                    appendField(grid, label, value);
                }
            });
            subCard.appendChild(grid);
            container.appendChild(subCard);
        });
    }

    try {
        const res = await fetch("/api/data");
        const data = await res.json();
        renderKeyValue("personalInfoGrid", data.personal || {}, PERSONAL_FIELD_LABELS);

        const anyEmploymentRendered = renderCategorySections(
            "employmentSections",
            data.employment || {},
            EMPLOYMENT_CATEGORY_LABELS,
            EMPLOYMENT_FIELD_LABELS
        );
        if (!anyEmploymentRendered) {
            const p = document.createElement("p");
            p.textContent = "No employment details submitted yet.";
            document.getElementById("employmentSections").appendChild(p);
        }

        renderIncomeCalculations(data.incomeCalculations || {});
        renderSpouseOtherMember(data.spouseOtherMember || {});
        renderAssets(data.assets || {});
        renderLiabilities(data.liabilities || {});
        renderKeyValue("questionnaireGrid", data.questionnaire || {}, QUESTIONNAIRE_FIELD_LABELS);
        renderKeyValue("incomeGrid", data.income || {}, INCOME_FIELD_LABELS);
        renderExpenses(data.expenses || {});
    } catch (err) {
        document.getElementById("pageContent").innerHTML =
            '<p class="error">Failed to load submission data.</p>';
    }
});

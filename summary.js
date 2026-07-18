document.addEventListener("DOMContentLoaded", async () => {
    const allowed = await Gate.enforce(
        "assetsSubmitted",
        "#pageContent",
        "Please submit Personal Info, Employment Info, and Assets Info first.",
        "assets.html"
    );
    if (!allowed) return;

    const {
        PERSONAL_FIELD_LABELS,
        EMPLOYMENT_CATEGORY_LABELS,
        EMPLOYMENT_FIELD_LABELS,
        ASSET_CATEGORY_LABELS,
        ASSET_FIELD_LABELS,
        BANKRUPTCY_EQUITY_FIELD_LABELS,
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

    function renderPersonal(personal) {
        const grid = document.getElementById("personalInfoGrid");
        const entries = Object.entries(PERSONAL_FIELD_LABELS).filter(
            ([key]) => personal[key] !== undefined && personal[key] !== null && String(personal[key]).trim() !== ""
        );

        if (entries.length === 0) {
            const p = document.createElement("p");
            p.textContent = "None provided.";
            grid.appendChild(p);
            return;
        }

        entries.forEach(([key, label]) => appendField(grid, label, personal[key]));
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

    try {
        const res = await fetch("/api/data");
        const data = await res.json();
        renderPersonal(data.personal || {});

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

        renderAssets(data.assets || {});
    } catch (err) {
        document.getElementById("pageContent").innerHTML =
            '<p class="error">Failed to load submission data.</p>';
    }
});

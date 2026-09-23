document.addEventListener("DOMContentLoaded", async () => {
    const allowed = await Gate.enforce(
        "assetsSubmitted",
        "#pageContent",
        "Please submit Assets Info first.",
        "assets.html"
    );
    if (!allowed) return;

    const btn = document.getElementById("addLiabilityBtn");
    const template = document.getElementById("liabilityTemplate");
    const container = document.getElementById("liabilityContainer");

    function wireConditionalReveal(card, triggerSelector, matchValue, targetSelector) {
        const trigger = card.querySelector(triggerSelector);
        const target = card.querySelector(targetSelector);
        const apply = () => {
            target.style.display = trigger.value === matchValue ? "" : "none";
        };
        trigger.addEventListener("input", apply);
        trigger.addEventListener("change", apply);
        apply();
    }

    function wireCard(card) {
        wireConditionalReveal(card, ".creditor-name-input", "Others", ".creditor-name-other");
        wireConditionalReveal(card, ".debt-type-select", "Other", ".debt-type-description");
        wireConditionalReveal(card, ".debt-security-select", "Secured", ".secured-against");
    }

    btn.addEventListener("click", () => {
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector(".entry-card");
        const removeBtn = card.querySelector(".removeEntryBtn");
        removeBtn.addEventListener("click", () => {
            card.remove();
            recalcTotals();
        });
        wireCard(card);
        container.prepend(clone);
        recalcTotals();
    });

    function recalcTotals() {
        let totalSecured = 0;
        let totalUnsecured = 0;

        document.querySelectorAll("#liabilityContainer .entry-card").forEach((card) => {
            const debtSecurityType = card.querySelector('[name="debtSecurityType"]').value;
            const amount = parseFloat(card.querySelector('[name="debtAmount"]').value) || 0;

            if (debtSecurityType === "Secured") {
                totalSecured += amount;
            } else if (debtSecurityType === "Unsecured") {
                totalUnsecured += amount;
            }
        });

        document.getElementById("totalSecuredDebt").textContent = totalSecured.toFixed(2);
        document.getElementById("totalUnsecuredDebt").textContent = totalUnsecured.toFixed(2);
    }

    container.addEventListener("input", recalcTotals);
    container.addEventListener("change", recalcTotals);

    function collectEntries() {
        return Array.from(document.querySelectorAll("#liabilityContainer .entry-card")).map((card) => {
            const entry = {};
            card.querySelectorAll("input, select").forEach((field) => {
                if (field.name && field.offsetParent !== null) {
                    entry[field.name] = field.value;
                }
            });
            return entry;
        });
    }

    const submitBtn = document.getElementById("submitLiabilitiesBtn");
    const submitStatus = document.getElementById("submitStatus");

    submitBtn.addEventListener("click", async () => {
        const payload = {
            liabilities: collectEntries(),
        };

        submitStatus.textContent = "Submitting...";
        submitStatus.className = "";

        try {
            const res = await fetch("/api/liabilities", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error("Request failed");

            submitStatus.textContent = "Saved. You can continue to Summary.";
            submitStatus.className = "success";
            window.dispatchEvent(new Event("nav:refresh"));
        } catch (err) {
            submitStatus.textContent = "Failed to save. Please try again.";
            submitStatus.className = "error";
        }
    });
});

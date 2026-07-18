document.addEventListener("DOMContentLoaded", async () => {
    const allowed = await Gate.enforce(
        "employmentSubmitted",
        "#pageContent",
        "Please submit Employment Info first.",
        "employment.html"
    );
    if (!allowed) return;

    function wireEntryButton(buttonId, templateId, containerId, onClone) {
        const btn = document.getElementById(buttonId);
        const template = document.getElementById(templateId);
        const container = document.getElementById(containerId);

        if (!btn || !template || !container) {
            console.error(`assets.js: missing element for "${buttonId}"`, { btn, template, container });
            return;
        }

        btn.addEventListener("click", () => {
            const clone = template.content.cloneNode(true);
            const card = clone.querySelector(".entry-card");
            const removeBtn = card.querySelector(".removeEntryBtn");
            removeBtn.addEventListener("click", () => card.remove());
            if (onClone) onClone(card);
            container.appendChild(clone);
        });
    }

    function wireTypeToggle(card) {
        const select = card.querySelector(".type-select");
        if (!select) return;

        const groups = card.querySelectorAll(".type-group");
        const notes = card.querySelectorAll(".note-list");

        const apply = () => {
            groups.forEach((group) => {
                group.style.display = group.dataset.type === select.value ? "" : "none";
            });
            notes.forEach((note) => {
                note.style.display = note.dataset.note === select.value ? "" : "none";
            });
        };

        select.addEventListener("change", apply);
        apply();
    }

    function wireVehicleMirror(card) {
        card.querySelectorAll(".mirror-source").forEach((source) => {
            const key = source.dataset.mirror;
            const target = card.querySelector(`[data-mirror-target="${key}"]`);
            const sync = () => {
                target.textContent = source.value;
            };
            source.addEventListener("input", sync);
            sync();
        });
    }

    wireEntryButton("addPropertyBtn", "propertyTemplate", "propertyContainer", wireTypeToggle);
    wireEntryButton("addVehicleBtn", "vehicleTemplate", "vehicleContainer", (card) => {
        wireTypeToggle(card);
        wireVehicleMirror(card);
    });
    wireEntryButton("addPolicyBtn", "policyTemplate", "policyContainer", wireTypeToggle);
    wireEntryButton("addSecurityBtn", "securityTemplate", "securityContainer", wireTypeToggle);
    wireEntryButton("addOtherAssetBtn", "otherAssetTemplate", "otherAssetContainer");

    function collectEntries(containerId) {
        return Array.from(document.querySelectorAll(`#${containerId} .entry-card`)).map((card) => {
            const entry = {};
            card.querySelectorAll("input, select").forEach((field) => {
                if (field.name && field.offsetParent !== null) {
                    entry[field.name] = field.value;
                }
            });
            return entry;
        });
    }

    try {
        const res = await fetch("/api/data");
        const data = await res.json();
        const selfEmployed = (data.employment && data.employment.selfEmployed) || [];
        const hasCorporation = selfEmployed.some(
            (entry) => entry.operationsType === "Corporation" || entry.operationsType === "Incorporated"
        );
        if (hasCorporation) {
            document.getElementById("bankruptcyEquitySection").style.display = "";
        }
    } catch (err) {
        // If the check fails, leave the Bankruptcy Equity section hidden.
    }

    const submitBtn = document.getElementById("submitAssetsBtn");
    const submitStatus = document.getElementById("submitStatus");

    submitBtn.addEventListener("click", async () => {
        const bankruptcyEquitySection = document.getElementById("bankruptcyEquitySection");
        const bankruptcyEquityVisible = bankruptcyEquitySection.style.display !== "none";
        const payload = {
            properties: collectEntries("propertyContainer"),
            vehicles: collectEntries("vehicleContainer"),
            policies: collectEntries("policyContainer"),
            securities: collectEntries("securityContainer"),
            otherAssets: collectEntries("otherAssetContainer"),
            bankruptcyEquityAssetDescription: bankruptcyEquityVisible
                ? document.getElementById("bankruptcyEquityAssetDescription").value
                : "",
            bankruptcyEquityAssetsValue: bankruptcyEquityVisible
                ? document.getElementById("bankruptcyEquityAssetsValue").value
                : "",
        };

        submitStatus.textContent = "Submitting...";
        submitStatus.className = "";

        try {
            const res = await fetch("/api/assets", {
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

document.addEventListener("DOMContentLoaded", async () => {
    const allowed = await Gate.enforce(
        "spouseOtherMemberSubmitted",
        "#pageContent",
        "Please submit Spouse & Other Member Info first.",
        "spouse-other-member.html"
    );
    if (!allowed) return;

    function wireEntryButton(buttonId, templateId, containerId) {
        const btn = document.getElementById(buttonId);
        const template = document.getElementById(templateId);
        const container = document.getElementById(containerId);

        if (!btn || !template || !container) {
            console.error(`employment.js: missing element for "${buttonId}"`, { btn, template, container });
            return;
        }

        btn.addEventListener("click", () => {
            const clone = template.content.cloneNode(true);
            const card = clone.querySelector(".entry-card");
            const removeBtn = card.querySelector(".removeEntryBtn");
            removeBtn.addEventListener("click", () => card.remove());
            container.prepend(clone);
        });
    }

    wireEntryButton("employedBtn", "employmentTemplate", "employmentContainer");
    wireEntryButton("unemployedBtn", "unemploymentTemplate", "unemploymentContainer");
    wireEntryButton("retiredBtn", "retiredTemplate", "retiredContainer");
    wireEntryButton("disabledBtn", "disabledTemplate", "disabledContainer");
    wireEntryButton("selfEmployedBtn", "selfEmployedTemplate", "selfEmployedContainer");
    wireEntryButton("benefitsBtn", "benefitsTemplate", "benefitsContainer");

    function collectEntries(containerId) {
        return Array.from(document.querySelectorAll(`#${containerId} .entry-card`)).map((card) => {
            const entry = {};
            card.querySelectorAll("input, select").forEach((field) => {
                if (field.name) entry[field.name] = field.value;
            });
            return entry;
        });
    }

    const submitBtn = document.getElementById("submitEmploymentBtn");
    const submitStatus = document.getElementById("submitStatus");

    submitBtn.addEventListener("click", async () => {
        const payload = {
            employment: collectEntries("employmentContainer"),
            unemployment: collectEntries("unemploymentContainer"),
            retired: collectEntries("retiredContainer"),
            disabled: collectEntries("disabledContainer"),
            selfEmployed: collectEntries("selfEmployedContainer"),
            benefits: collectEntries("benefitsContainer"),
        };

        submitStatus.textContent = "Submitting...";
        submitStatus.className = "";

        try {
            const res = await fetch("/api/employment", {
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

document.addEventListener("DOMContentLoaded", async () => {
    const allowed = await Gate.enforce(
        "liabilitiesSubmitted",
        "#pageContent",
        "Please submit Liabilities Info first.",
        "liabilities.html"
    );
    if (!allowed) return;

    document.querySelectorAll(".question-block").forEach((block) => {
        const radios = block.querySelectorAll(".question-radio");
        const textareaLabel = block.querySelector(".detail-textarea");

        const apply = () => {
            const selected = block.querySelector(".question-radio:checked");
            textareaLabel.style.display = selected && selected.value === "Yes" ? "" : "none";
        };

        radios.forEach((radio) => radio.addEventListener("change", apply));
        apply();
    });

    function collectAnswers() {
        const data = {};
        document.querySelectorAll("#pageContent input, #pageContent textarea").forEach((field) => {
            if (!field.name || field.offsetParent === null) return;
            if (field.type === "radio") {
                if (field.checked) data[field.name] = field.value;
            } else {
                data[field.name] = field.value;
            }
        });
        return data;
    }

    const submitBtn = document.getElementById("submitQuestionnaireBtn");
    const submitStatus = document.getElementById("submitStatus");

    submitBtn.addEventListener("click", async () => {
        const payload = collectAnswers();

        submitStatus.textContent = "Submitting...";
        submitStatus.className = "";

        try {
            const res = await fetch("/api/questionnaire", {
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

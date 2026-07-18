document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("personalForm");
  const maritalStatus = document.getElementById("maritalStatus");
  const spouseNameDiv = document.getElementById("spouseNameDiv");
  const numberOfDependents = document.getElementById("numberOfDependents");
  const ctbDiv = document.getElementById("ctbDiv");
  const submitStatus = document.getElementById("submitStatus");

  function toggleSpouseName() {
    const showSpouse =
        maritalStatus.value === "Married" ||
        maritalStatus.value === "Seperated" ||
        maritalStatus.value === "Common-Law";

    spouseNameDiv.style.display = showSpouse ? "block" : "none";
  }

  function toggleCtb() {
    const hasDependents = Number(numberOfDependents.value) > 0;
    ctbDiv.style.display = hasDependents ? "block" : "none";
  }

  maritalStatus.addEventListener("change", toggleSpouseName);
  numberOfDependents.addEventListener("input", toggleCtb);

  toggleSpouseName();
  toggleCtb();

  const bankruptcyMirrorFields = [
    ["firstName", "bankruptcyFirstName"],
    ["middleName", "bankruptcyMiddleName"],
    ["lastName", "bankruptcyLastName"],
    ["aliasFirstName", "bankruptcyAliasFirstName"],
    ["aliasLastName", "bankruptcyAliasLastName"],
    ["dateOfBirth", "bankruptcyDateOfBirth"],
  ];

  bankruptcyMirrorFields.forEach(([sourceName, targetName]) => {
    const source = form.querySelector(`[name="${sourceName}"]`);
    const target = form.querySelector(`[name="${targetName}"]`);
    const display = document.getElementById(`${targetName}Display`);
    const sync = () => {
      target.value = source.value;
      display.textContent = source.value;
    };
    source.addEventListener("input", sync);
    sync();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());

    submitStatus.textContent = "Submitting...";
    submitStatus.className = "";

    try {
      const res = await fetch("/api/personal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Request failed");

      submitStatus.textContent = "Saved. You can continue to Employment.";
      submitStatus.className = "success";
      window.dispatchEvent(new Event("nav:refresh"));
    } catch (err) {
      submitStatus.textContent = "Failed to save. Please try again.";
      submitStatus.className = "error";
    }
  });
});

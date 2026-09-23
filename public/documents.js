document.addEventListener("DOMContentLoaded", async () => {
  const allowed = await Gate.enforce(
    "expensesSubmitted",
    "#pageContent",
    "Please submit Expenses Info first.",
    "expenses.html"
  );
  if (!allowed) return;

  const container = document.getElementById("categoriesContainer");
  let overseasChoice = "";

  function hasEntries(arr) {
    return Array.isArray(arr) && arr.length > 0;
  }

  function hasNonDiscretionaryExpense(data) {
    const expenses = data.expenses || {};
    const fields = [
      "childSupportPayments",
      "spousalSupportPayments",
      "childCare",
      "medicalConditionExpenses",
      "finesPenaltiesCourt",
      "employmentConditionExpenses",
      "debtsStayFiled",
      "businessRelatedExpenses",
    ];
    const anyFieldFilled = fields.some((f) => expenses[f] !== undefined && expenses[f] !== null && String(expenses[f]).trim() !== "");
    return anyFieldFilled || hasEntries(expenses.otherExpenses);
  }

  // Each section groups related document slots; a section only renders if its
  // own condition passes, and each slot within it is independently gated too
  // (e.g. "Income Documents" shows once any employment type exists, but which
  // specific slots appear depends on which type).
  function buildSections(data) {
    const employment = data.employment || {};
    const assets = data.assets || {};
    const liabilities = data.liabilities || {};

    return [
      {
        title: "Identification & Banking",
        condition: () => true,
        slots: [
          { key: "Identification Document", note: "e.g. driver's licence, passport, or other government-issued ID" },
          { key: "VOID Cheque / PAD Form / Banking Document" },
        ],
      },
      {
        title: "Income Documents",
        condition: () =>
          hasEntries(employment.employment) ||
          hasEntries(employment.unemployment) ||
          hasEntries(employment.retired) ||
          hasEntries(employment.disabled) ||
          hasEntries(employment.selfEmployed),
        slots: [
          { key: "Paystubs", condition: () => hasEntries(employment.employment) },
          {
            key: "Bank Statements",
            note: "2 months minimum",
            condition: () => hasEntries(employment.unemployment) || hasEntries(employment.retired),
          },
          { key: "Bank Statements Showing Income", condition: () => hasEntries(employment.disabled) },
          {
            key: "Uber / Business Account Statements / Tax Returns",
            condition: () => hasEntries(employment.selfEmployed),
          },
          { key: "3-Month POI Sheet", condition: () => hasEntries(employment.selfEmployed) },
          { key: "Personal Bank Statements", condition: () => hasEntries(employment.selfEmployed) },
        ],
      },
      {
        title: "Assets Documents",
        condition: () =>
          (assets.properties || []).some((p) => p.propertyType === "House") ||
          hasEntries(assets.vehicles) ||
          hasEntries(assets.securities) ||
          (assets.policies || []).some((p) => p.policyType === "RRSP" || p.policyType === "RESP"),
        slots: [
          {
            key: "Property Valuation Document",
            condition: () => (assets.properties || []).some((p) => p.propertyType === "House"),
          },
          { key: "Vehicle Registration", condition: () => hasEntries(assets.vehicles) },
          { key: "Vehicle Valuation Document", condition: () => hasEntries(assets.vehicles) },
          {
            key: "Investment / RRSP / RESP Valuation Document",
            condition: () =>
              hasEntries(assets.securities) ||
              (assets.policies || []).some((p) => p.policyType === "RRSP" || p.policyType === "RESP"),
          },
        ],
      },
      {
        title: "Liabilities",
        condition: () => hasEntries(liabilities.liabilities),
        slots: [{ key: "Debt Proof (large debts, payday loans)", note: "You can upload multiple documents" }],
      },
      {
        title: "Non-Discretionary Expense Proof",
        condition: () => hasNonDiscretionaryExpense(data),
        slots: [{ key: "Proof of Expense" }],
      },
    ].filter((section) => section.condition());
  }

  function fileRow(doc, onRemove) {
    const row = document.createElement("div");
    row.className = "doc-file-row";
    const name = document.createElement("span");
    name.textContent = doc.original_filename;
    row.appendChild(name);
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "removeEntryBtn";
    removeBtn.setAttribute("aria-label", "Remove document");
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", () => onRemove(doc.id));
    row.appendChild(removeBtn);
    return row;
  }

  async function uploadFiles(category, fileList) {
    const formData = new FormData();
    formData.append("category", category);
    Array.from(fileList).forEach((file) => formData.append("files", file));
    const res = await fetch("/api/documents", { method: "POST", body: formData });
    if (!res.ok) throw new Error("Upload failed");
    return res.json();
  }

  async function deleteDocument(id) {
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Delete failed");
  }

  function renderSlot(slotKey, note, existingDocs, onChange) {
    const card = document.createElement("div");
    card.className = "doc-category";

    const header = document.createElement("div");
    header.className = "doc-category-header";
    const h3 = document.createElement("h3");
    h3.textContent = slotKey;
    header.appendChild(h3);

    const status = document.createElement("span");
    status.className = "doc-category-status" + (existingDocs.length > 0 ? " fulfilled" : "");
    status.textContent = existingDocs.length > 0 ? `✓ ${existingDocs.length} uploaded` : "Not uploaded";
    header.appendChild(status);
    card.appendChild(header);

    if (note) {
      const noteEl = document.createElement("p");
      noteEl.className = "doc-note";
      noteEl.textContent = note;
      card.appendChild(noteEl);
    }

    const fileList = document.createElement("div");
    fileList.className = "doc-file-list";
    existingDocs.forEach((doc) => {
      fileList.appendChild(
        fileRow(doc, async (id) => {
          await deleteDocument(id);
          onChange();
        })
      );
    });
    card.appendChild(fileList);

    const uploadRow = document.createElement("div");
    uploadRow.className = "doc-upload-row";
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    const uploadBtn = document.createElement("button");
    uploadBtn.type = "button";
    uploadBtn.textContent = "Upload";
    uploadBtn.addEventListener("click", async () => {
      if (!input.files || input.files.length === 0) return;
      uploadBtn.disabled = true;
      try {
        await uploadFiles(slotKey, input.files);
        input.value = "";
        onChange();
      } catch (err) {
        alert("Upload failed. Please try again.");
      } finally {
        uploadBtn.disabled = false;
      }
    });
    uploadRow.appendChild(input);
    uploadRow.appendChild(uploadBtn);
    card.appendChild(uploadRow);

    return card;
  }

  async function loadAndRender() {
    const [dataRes, docsRes] = await Promise.all([fetch("/api/data"), fetch("/api/documents")]);
    const data = await dataRes.json();
    const docs = await docsRes.json();

    const docsByCategory = {};
    docs.forEach((doc) => {
      if (!docsByCategory[doc.category]) docsByCategory[doc.category] = [];
      docsByCategory[doc.category].push(doc);
    });

    container.innerHTML = "";

    buildSections(data).forEach((section) => {
      const sectionEl = document.createElement("section");
      const heading = document.createElement("h2");
      heading.textContent = section.title;
      sectionEl.appendChild(heading);

      section.slots
        .filter((slot) => !slot.condition || slot.condition())
        .forEach((slot) => {
          sectionEl.appendChild(renderSlot(slot.key, slot.note, docsByCategory[slot.key] || [], loadAndRender));
        });

      container.appendChild(sectionEl);
    });

    renderOverseasSection(docsByCategory["Proof of Transfer"] || []);
  }

  function renderOverseasSection(existingDocs) {
    const sectionEl = document.createElement("section");
    const heading = document.createElement("h2");
    heading.textContent = "Sending Money Overseas";
    sectionEl.appendChild(heading);

    const toggleCard = document.createElement("div");
    toggleCard.className = "doc-category";
    const toggleRow = document.createElement("div");
    toggleRow.className = "overseas-toggle";
    const label = document.createElement("label");
    label.textContent = "Does this client send money overseas?";
    const select = document.createElement("select");
    ["", "No", "Yes"].forEach((opt) => {
      const option = document.createElement("option");
      option.value = opt;
      option.textContent = opt || "Select...";
      select.appendChild(option);
    });
    select.value = overseasChoice || (existingDocs.length > 0 ? "Yes" : "");
    label.appendChild(select);
    toggleRow.appendChild(label);
    toggleCard.appendChild(toggleRow);
    sectionEl.appendChild(toggleCard);

    const slotContainer = document.createElement("div");
    sectionEl.appendChild(slotContainer);

    function renderProofSlot() {
      overseasChoice = select.value;
      slotContainer.innerHTML = "";
      if (select.value === "Yes") {
        slotContainer.appendChild(renderSlot("Proof of Transfer", "", existingDocs, loadAndRender));
      }
    }
    select.addEventListener("change", renderProofSlot);
    renderProofSlot();

    container.appendChild(sectionEl);
  }

  await loadAndRender();
});

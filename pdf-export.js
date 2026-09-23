const PDFDocument = require("pdfkit");
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
  EXPENSE_SECTIONS,
  EXPENSE_OTHER_FIELD_LABELS,
  EXPENSE_SUMMARY_FIELD_LABELS,
  INCOME_CALC_CATEGORY_LABELS,
  INCOME_CALC_EMPLOYED_FIELD_LABELS,
  INCOME_CALC_UNEMPLOYED_FIELD_LABELS,
  INCOME_CALC_DISABLED_FIELD_LABELS,
  INCOME_CALC_SELF_EMPLOYED_FIELD_LABELS,
  INCOME_CALC_BENEFITS_FIELD_LABELS,
  INCOME_CALC_TOTALS_LABELS,
  SOM_FIELD_LABELS,
  SOM_OTHER_ADULT_FIELD_LABELS,
  INCOME_ROWS,
  INCOME_COLUMNS,
} = require("./field-labels");

// --- Grid table drawing primitives ---

function ensureSpace(doc, height) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + height > bottom) {
    doc.addPage();
  }
}

function writeSectionTitle(doc, title) {
  doc.moveDown(0.5);
  ensureSpace(doc, 24);
  doc.fontSize(14).font("Helvetica-Bold").fillColor("#234461").text(title, { underline: true });
  doc.moveDown(0.25);
}

function writeSubHeading(doc, text) {
  ensureSpace(doc, 18);
  doc.moveDown(0.2);
  doc.fontSize(12).font("Helvetica-Bold").fillColor("#234461").text(text);
  doc.moveDown(0.1);
}

// Draws a bordered 2-column (label | value) grid for a flat list of [label, value] pairs.
function drawKeyValueTable(doc, entries, indent = 0) {
  if (!entries || entries.length === 0) {
    ensureSpace(doc, 16);
    doc.fontSize(10).font("Helvetica").fillColor("#555555").text("None provided.", doc.page.margins.left + indent);
    doc.moveDown(0.3);
    return;
  }

  const startX = doc.page.margins.left + indent;
  const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right - indent;
  const labelWidth = usableWidth * 0.4;
  const valueWidth = usableWidth - labelWidth;
  const padding = 5;

  entries.forEach(([label, value]) => {
    const labelText = String(label);
    const valueText = String(value);

    doc.fontSize(10);
    const labelHeight = doc.font("Helvetica-Bold").heightOfString(labelText, { width: labelWidth - padding * 2 });
    const valueHeight = doc.font("Helvetica").heightOfString(valueText, { width: valueWidth - padding * 2 });
    const rowHeight = Math.max(labelHeight, valueHeight) + padding * 2;

    ensureSpace(doc, rowHeight);
    const rowY = doc.y;

    doc.rect(startX, rowY, labelWidth, rowHeight).fillAndStroke("#e0ffff", "#999999");
    doc.rect(startX + labelWidth, rowY, valueWidth, rowHeight).fillAndStroke("#ffffff", "#999999");

    doc
      .fillColor("#234461")
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(labelText, startX + padding, rowY + padding, { width: labelWidth - padding * 2 });
    doc
      .fillColor("#000000")
      .font("Helvetica")
      .fontSize(10)
      .text(valueText, startX + labelWidth + padding, rowY + padding, { width: valueWidth - padding * 2 });

    doc.x = doc.page.margins.left;
    doc.y = rowY + rowHeight;
  });

  doc.moveDown(0.3);
}

function filteredEntries(obj, labelMap) {
  return Object.entries(labelMap)
    .filter(([key]) => {
      const value = obj ? obj[key] : undefined;
      return value !== undefined && value !== null && String(value).trim() !== "";
    })
    .map(([key, label]) => [label, obj[key]]);
}

function writeKeyValueSection(doc, title, obj, labelMap) {
  writeSectionTitle(doc, title);
  drawKeyValueTable(doc, filteredEntries(obj, labelMap));
}

function writeCategorySection(doc, title, dataObj, categoryLabels, fieldLabels) {
  writeSectionTitle(doc, title);

  let anyWritten = false;

  Object.entries(categoryLabels).forEach(([category, categoryLabel]) => {
    const rawEntries = (dataObj && dataObj[category]) || [];
    if (rawEntries.length === 0) return;

    anyWritten = true;
    writeSubHeading(doc, categoryLabel);

    rawEntries.forEach((entry, index) => {
      ensureSpace(doc, 16);
      doc.fontSize(10).font("Helvetica-Bold").fillColor("#234461").text(`Entry ${index + 1}`);
      drawKeyValueTable(doc, filteredEntries(entry, fieldLabels), 12);
    });
  });

  return anyWritten;
}

function writeEmploymentSection(doc, employment) {
  const anyWritten = writeCategorySection(
    doc,
    "Employment Info",
    employment,
    EMPLOYMENT_CATEGORY_LABELS,
    EMPLOYMENT_FIELD_LABELS
  );

  if (!anyWritten) {
    ensureSpace(doc, 16);
    doc.fontSize(10).font("Helvetica").fillColor("#000000").text("No employment details submitted yet.");
  }
}

function writeAssetsSection(doc, assets) {
  const anyWritten = writeCategorySection(
    doc,
    "Assets Info",
    assets,
    ASSET_CATEGORY_LABELS,
    ASSET_FIELD_LABELS
  );

  const bankruptcyEquityEntries = filteredEntries(assets, BANKRUPTCY_EQUITY_FIELD_LABELS);
  const hasBankruptcyEquity = bankruptcyEquityEntries.length > 0;

  if (hasBankruptcyEquity) {
    writeSubHeading(doc, "Bankruptcy Equity (Assets)");
    drawKeyValueTable(doc, bankruptcyEquityEntries);
  }

  if (!anyWritten && !hasBankruptcyEquity) {
    ensureSpace(doc, 16);
    doc.fontSize(10).font("Helvetica").fillColor("#000000").text("No assets details submitted yet.");
  }
}

function computeDebtTotals(liabilities) {
  const entries = (liabilities && liabilities.liabilities) || [];
  return entries.reduce(
    (totals, entry) => {
      const amount = parseFloat(entry.debtAmount) || 0;
      if (entry.debtSecurityType === "Secured") totals.secured += amount;
      else if (entry.debtSecurityType === "Unsecured") totals.unsecured += amount;
      return totals;
    },
    { secured: 0, unsecured: 0 }
  );
}

function writeLiabilitiesSection(doc, liabilities) {
  const anyWritten = writeCategorySection(
    doc,
    "Liabilities Info",
    liabilities,
    LIABILITY_CATEGORY_LABELS,
    LIABILITY_FIELD_LABELS
  );

  if (!anyWritten) {
    ensureSpace(doc, 16);
    doc.fontSize(10).font("Helvetica").fillColor("#000000").text("No liabilities details submitted yet.");
    return;
  }

  const totals = computeDebtTotals(liabilities);
  writeSubHeading(doc, "Debt Totals");
  drawKeyValueTable(doc, [
    ["Total Secured Debt", `$${totals.secured.toFixed(2)}`],
    ["Total Unsecured Debt", `$${totals.unsecured.toFixed(2)}`],
  ]);
}

function writeExpensesSection(doc, expenses) {
  writeSectionTitle(doc, "Expenses Info");

  let anyWritten = false;

  EXPENSE_SECTIONS.forEach((section) => {
    const rowEntries = filteredEntries(expenses, Object.fromEntries(section.rows));
    const otherEntries = (expenses && expenses[section.otherArrayName]) || [];
    const subtotal = expenses && expenses[`subtotal_${section.key}`];
    const hasSubtotal = subtotal !== undefined && subtotal !== null && String(subtotal).trim() !== "";

    if (rowEntries.length === 0 && otherEntries.length === 0 && !hasSubtotal) return;

    anyWritten = true;
    writeSubHeading(doc, section.title);
    drawKeyValueTable(doc, rowEntries);

    otherEntries.forEach((entry, index) => {
      ensureSpace(doc, 14);
      doc.fontSize(10).font("Helvetica-Bold").fillColor("#234461").text(`Other Entry ${index + 1}`);
      drawKeyValueTable(doc, filteredEntries(entry, EXPENSE_OTHER_FIELD_LABELS), 12);
    });

    if (hasSubtotal) {
      drawKeyValueTable(doc, [[section.subtotalLabel, `$${subtotal}`]]);
    }
  });

  if (!anyWritten) {
    ensureSpace(doc, 16);
    doc.fontSize(10).font("Helvetica").fillColor("#000000").text("No expenses details submitted yet.");
    return;
  }

  const summaryEntries = filteredEntries(expenses, EXPENSE_SUMMARY_FIELD_LABELS).map(([label, value]) => [
    label,
    `$${value}`,
  ]);

  if (summaryEntries.length > 0) {
    writeSubHeading(doc, "Expense Summary");
    drawKeyValueTable(doc, summaryEntries);
  }
}

function incomeCalcInstanceEntries(category, entry) {
  if (category === "employed") {
    const entries = filteredEntries(entry, INCOME_CALC_EMPLOYED_FIELD_LABELS);
    (entry.deductions || []).forEach((deduction, i) => {
      const desc = deduction.description;
      const amount = deduction.amount;
      if ((desc && String(desc).trim()) || (amount && String(amount).trim())) {
        entries.push([`Deduction ${i + 1}`, `${desc || ""} ${amount ? `$${amount}` : ""}`.trim()]);
      }
    });
    return entries;
  }
  if (category === "unemployed") return filteredEntries(entry, INCOME_CALC_UNEMPLOYED_FIELD_LABELS);
  if (category === "retired") {
    return (entry.pensions || [])
      .map((pension, i) => {
        const type = pension.pensionType;
        const amount = pension.monthlyIncome;
        if ((type && String(type).trim()) || (amount && String(amount).trim())) {
          return [`Pension ${i + 1}`, `${type || ""} ${amount ? `$${amount}` : ""}`.trim()];
        }
        return null;
      })
      .filter(Boolean);
  }
  if (category === "disabled") return filteredEntries(entry, INCOME_CALC_DISABLED_FIELD_LABELS);
  if (category === "selfEmployed") return filteredEntries(entry, INCOME_CALC_SELF_EMPLOYED_FIELD_LABELS);
  if (category === "benefits") return filteredEntries(entry, INCOME_CALC_BENEFITS_FIELD_LABELS);
  return [];
}

function writeIncomeCalcPerson(doc, personLabel, personData) {
  let anyWritten = false;

  Object.entries(INCOME_CALC_CATEGORY_LABELS).forEach(([category, categoryLabel]) => {
    const entries = (personData && personData[category]) || [];
    if (entries.length === 0) return;

    anyWritten = true;
    writeSubHeading(doc, `${personLabel} - ${categoryLabel}`);

    entries.forEach((entry, index) => {
      ensureSpace(doc, 14);
      doc.fontSize(10).font("Helvetica-Bold").fillColor("#234461").text(`Entry ${index + 1}`);
      drawKeyValueTable(doc, incomeCalcInstanceEntries(category, entry), 12);
    });
  });

  return anyWritten;
}

function writeIncomeCalculationsSection(doc, incomeCalculations) {
  writeSectionTitle(doc, "Income Calculations");

  const debtorWritten = writeIncomeCalcPerson(doc, "Debtor", incomeCalculations && incomeCalculations.debtor);
  const spouseWritten = writeIncomeCalcPerson(doc, "Spouse", incomeCalculations && incomeCalculations.spouse);

  if (!debtorWritten && !spouseWritten) {
    ensureSpace(doc, 16);
    doc.fontSize(10).font("Helvetica").fillColor("#000000").text("No income calculation details submitted yet.");
    return;
  }

  const totals = (incomeCalculations && incomeCalculations.totals) || {};
  const totalsEntries = filteredEntries(totals, INCOME_CALC_TOTALS_LABELS).map(([label, value]) => [
    label,
    `$${value}`,
  ]);

  if (totalsEntries.length > 0) {
    writeSubHeading(doc, "Computed Totals Pushed to Income");
    drawKeyValueTable(doc, totalsEntries);
  }
}

function writeSpouseOtherMemberSection(doc, somData) {
  writeSectionTitle(doc, "Spouse & Other Member Info");
  drawKeyValueTable(doc, filteredEntries(somData, SOM_FIELD_LABELS));

  const otherAdults = (somData && somData.otherAdults) || [];
  if (otherAdults.length > 0) {
    writeSubHeading(doc, "Other Adults");
    otherAdults.forEach((adult, index) => {
      ensureSpace(doc, 14);
      doc.fontSize(10).font("Helvetica-Bold").fillColor("#234461").text(`Entry ${index + 1}`);
      drawKeyValueTable(doc, filteredEntries(adult, SOM_OTHER_ADULT_FIELD_LABELS), 12);
    });
  }
}

// Renders the Income page as an actual multi-column grid (Monthly Income |
// Applicant | Spouse | Other Household), matching the on-screen layout.
function drawIncomeGrid(doc, income) {
  const startX = doc.page.margins.left;
  const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const labelColWidth = usableWidth * 0.34;
  const dataColWidth = (usableWidth - labelColWidth) / 3;
  const colWidths = [labelColWidth, dataColWidth, dataColWidth, dataColWidth];
  const colX = [
    startX,
    startX + labelColWidth,
    startX + labelColWidth + dataColWidth,
    startX + labelColWidth + dataColWidth * 2,
  ];
  const padding = 4;

  function drawRow(cells, opts = {}) {
    const font = opts.bold ? "Helvetica-Bold" : "Helvetica";
    doc.fontSize(9).font(font);
    const heights = cells.map((cell, i) => doc.heightOfString(String(cell), { width: colWidths[i] - padding * 2 }));
    const rowHeight = Math.max(...heights) + padding * 2;

    ensureSpace(doc, rowHeight);
    const rowY = doc.y;

    cells.forEach((cell, i) => {
      doc.rect(colX[i], rowY, colWidths[i], rowHeight).fillAndStroke(opts.fill || "#ffffff", "#999999");
      doc
        .fillColor(opts.textColor || "#000000")
        .font(font)
        .fontSize(9)
        .text(String(cell), colX[i] + padding, rowY + padding, { width: colWidths[i] - padding * 2 });
    });

    doc.x = doc.page.margins.left;
    doc.y = rowY + rowHeight;
  }

  drawRow(["Monthly Income", "Applicant", "Spouse", "Other Household"], {
    bold: true,
    fill: "#234461",
    textColor: "#ffffff",
  });

  INCOME_ROWS.forEach(([rowKey, rowLabel]) => {
    const cells = [rowLabel];
    INCOME_COLUMNS.forEach(([colKey]) => {
      const value = income && income[`${rowKey}_${colKey}`];
      cells.push(value ? `$${value}` : "");
    });
    drawRow(cells, { fill: "#e0ffff" });
  });

  const subtotalCells = ["Sub Total"];
  INCOME_COLUMNS.forEach(([colKey]) => {
    const value = income && income[`subtotal_${colKey}`];
    subtotalCells.push(`$${value || "0.00"}`);
  });
  drawRow(subtotalCells, { bold: true, fill: "#fffacd" });

  drawRow(
    ["Total Combined Income", `$${(income && income.totalCombinedIncome) || "0.00"}`, "", ""],
    { bold: true, fill: "#234461", textColor: "#ffffff" }
  );

  if (income && income.ctbAmount) {
    drawRow(["CTB Amount", `$${income.ctbAmount}`, "", ""], { fill: "#e0ffff" });
  }

  doc.moveDown(0.5);
}

function writeIncomeSection(doc, income) {
  writeSectionTitle(doc, "Income Info");
  drawIncomeGrid(doc, income || {});
}

// Builds the Filing Summary PDF for one case and streams it to `res`. Caller
// (server.js) is responsible for checking that every step has been submitted
// first (see requireAllSteps).
function renderFilingSummaryPdf(res, data) {
  const doc = new PDFDocument({ margin: 50 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=submission-summary.pdf");
  doc.pipe(res);

  doc.fontSize(20).fillColor("#234461").text("Filing Summary", { align: "center" });

  writeKeyValueSection(doc, "Personal Info", data.personal, PERSONAL_FIELD_LABELS);
  writeSpouseOtherMemberSection(doc, data.spouseOtherMember);
  writeEmploymentSection(doc, data.employment);
  writeIncomeCalculationsSection(doc, data.incomeCalculations);
  writeAssetsSection(doc, data.assets);
  writeLiabilitiesSection(doc, data.liabilities);
  writeKeyValueSection(doc, "Questionnaire", data.questionnaire, QUESTIONNAIRE_FIELD_LABELS);
  writeIncomeSection(doc, data.income);
  writeExpensesSection(doc, data.expenses);

  doc.end();
}

module.exports = renderFilingSummaryPdf;

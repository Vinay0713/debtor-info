const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const cookieParser = require("cookie-parser");
const PDFDocument = require("pdfkit");
const {
  PERSONAL_FIELD_LABELS,
  EMPLOYMENT_CATEGORY_LABELS,
  EMPLOYMENT_FIELD_LABELS,
  ASSET_CATEGORY_LABELS,
  ASSET_FIELD_LABELS,
  BANKRUPTCY_EQUITY_FIELD_LABELS,
} = require("./field-labels");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data.json");
const SESSION_COOKIE = "sessionId";
const EMPTY_SESSION = { personal: null, employment: null, assets: null };

function readStore() {
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return parsed.sessions ? parsed : { sessions: {} };
  } catch (err) {
    return { sessions: {} };
  }
}

function writeStore(store) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

function getSessionData(req) {
  const store = readStore();
  return store.sessions[req.sessionId] || EMPTY_SESSION;
}

function updateSessionData(req, patch) {
  const store = readStore();
  const current = store.sessions[req.sessionId] || EMPTY_SESSION;
  store.sessions[req.sessionId] = { ...current, ...patch };
  writeStore(store);
  return store.sessions[req.sessionId];
}

app.use(express.json());
app.use(cookieParser());

// Assigns a per-browser session cookie (no maxAge, so it clears when the
// browser closes) so each browser session sees only its own submissions.
app.use((req, res, next) => {
  let sessionId = req.cookies[SESSION_COOKIE];
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    res.cookie(SESSION_COOKIE, sessionId, { httpOnly: true, sameSite: "lax" });
  }
  req.sessionId = sessionId;
  next();
});

app.use(express.static(__dirname));

app.get("/api/status", (req, res) => {
  const data = getSessionData(req);
  res.json({
    personalSubmitted: Boolean(data.personal),
    employmentSubmitted: Boolean(data.employment),
    assetsSubmitted: Boolean(data.assets),
  });
});

app.get("/api/data", (req, res) => {
  res.json(getSessionData(req));
});

app.post("/api/personal", (req, res) => {
  updateSessionData(req, { personal: req.body });
  res.json({ ok: true });
});

app.post("/api/employment", (req, res) => {
  const data = getSessionData(req);
  if (!data.personal) {
    return res
      .status(409)
      .json({ ok: false, error: "Personal info must be submitted first." });
  }
  updateSessionData(req, { employment: req.body });
  res.json({ ok: true });
});

app.post("/api/assets", (req, res) => {
  const data = getSessionData(req);
  if (!data.employment) {
    return res
      .status(409)
      .json({ ok: false, error: "Employment info must be submitted first." });
  }
  updateSessionData(req, { assets: req.body });
  res.json({ ok: true });
});

function writeKeyValueSection(doc, title, obj, labelMap) {
  doc.moveDown(0.5);
  doc.fontSize(14).fillColor("#234461").text(title, { underline: true });
  doc.moveDown(0.25);
  doc.fontSize(11).fillColor("#000000");

  const entries = Object.entries(labelMap).filter(([key]) => {
    const value = obj ? obj[key] : undefined;
    return value !== undefined && value !== null && String(value).trim() !== "";
  });

  if (entries.length === 0) {
    doc.text("None provided.");
    return;
  }

  entries.forEach(([key, label]) => {
    doc.text(`${label}: ${obj[key]}`);
  });
}

function writeCategorySection(doc, title, dataObj, categoryLabels, fieldLabels, emptyMessage) {
  doc.moveDown(0.5);
  doc.fontSize(14).fillColor("#234461").text(title, { underline: true });

  let anyWritten = false;

  Object.entries(categoryLabels).forEach(([category, categoryLabel]) => {
    const rawEntries = (dataObj && dataObj[category]) || [];
    if (rawEntries.length === 0) return;

    anyWritten = true;
    doc.moveDown(0.35);
    doc.fontSize(12).fillColor("#234461").text(categoryLabel);
    doc.fontSize(11).fillColor("#000000");

    rawEntries.forEach((entry, index) => {
      doc.text(`Entry ${index + 1}:`);
      Object.entries(fieldLabels).forEach(([key, label]) => {
        const value = entry[key];
        if (value !== undefined && value !== null && String(value).trim() !== "") {
          doc.text(`  ${label}: ${value}`);
        }
      });
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
    doc.moveDown(0.35);
    doc.fontSize(11).fillColor("#000000").text("No employment details submitted yet.");
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

  const bankruptcyEquityEntries = Object.entries(BANKRUPTCY_EQUITY_FIELD_LABELS).filter(([key]) => {
    const value = assets && assets[key];
    return value !== undefined && value !== null && String(value).trim() !== "";
  });
  const hasBankruptcyEquity = bankruptcyEquityEntries.length > 0;

  if (hasBankruptcyEquity) {
    doc.moveDown(0.35);
    doc.fontSize(12).fillColor("#234461").text("Bankruptcy Equity (Assets)");
    doc.fontSize(11).fillColor("#000000");
    bankruptcyEquityEntries.forEach(([key, label]) => {
      doc.text(`${label}: ${assets[key]}`);
    });
  }

  if (!anyWritten && !hasBankruptcyEquity) {
    doc.moveDown(0.35);
    doc.fontSize(11).fillColor("#000000").text("No assets details submitted yet.");
  }
}

app.get("/api/pdf", (req, res) => {
  const data = getSessionData(req);
  if (!data.personal || !data.employment || !data.assets) {
    return res
      .status(409)
      .json({ ok: false, error: "Submit personal, employment, and assets info first." });
  }

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=submission-summary.pdf"
  );
  doc.pipe(res);

  doc.fontSize(20).fillColor("#234461").text("Filing Summary", { align: "center" });

  writeKeyValueSection(doc, "Personal Info", data.personal, PERSONAL_FIELD_LABELS);
  writeEmploymentSection(doc, data.employment);
  writeAssetsSection(doc, data.assets);

  doc.end();
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

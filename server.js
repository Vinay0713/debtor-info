const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");
const createDocumentsRouter = require("./documents-router");
const renderFilingSummaryPdf = require("./pdf-export");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, "data.json");
const SESSION_COOKIE = "sessionId";
// DATABASE_URL (set by Render's managed Postgres) takes priority; otherwise
// falls back to PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE, which is how the
// portable local Postgres used for office-server/dev deployments is configured.
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : new Pool();
const SESSION_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

// The nine form steps, in order. Drives EMPTY_SESSION, /api/status, and the
// requirePriorStep/requireAllSteps middleware below, so the step list only
// has to be written out once.
const ALL_STEPS = [
  "personal",
  "spouseOtherMember",
  "employment",
  "incomeCalculations",
  "assets",
  "liabilities",
  "questionnaire",
  "income",
  "expenses",
];

const EMPTY_SESSION = Object.fromEntries(ALL_STEPS.map((step) => [step, null]));

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

// Filing data is keyed by the logged-in user's email, not an anonymous cookie,
// so a case follows the account across browsers/devices.
function getSessionData(req) {
  const store = readStore();
  return store.sessions[req.userId] || EMPTY_SESSION;
}

function updateSessionData(req, patch) {
  const store = readStore();
  const current = store.sessions[req.userId] || EMPTY_SESSION;
  store.sessions[req.userId] = { ...current, ...patch };
  writeStore(store);
  return store.sessions[req.userId];
}

// Reads a case's Personal Info straight out of data.json for the documents
// router (kept here so documents.js doesn't need to know about DATA_FILE).
function getPersonalInfoFor(userId) {
  const store = readStore();
  return (store.sessions[userId] && store.sessions[userId].personal) || {};
}

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      folder_name TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      session_id UUID PRIMARY KEY,
      user_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id SERIAL PRIMARY KEY,
      user_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      category TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      stored_filename TEXT NOT NULL,
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Creates a session record and sets the cookie that identifies it. Called on
// successful signup or login.
async function startSession(res, userId) {
  const sessionId = crypto.randomUUID();
  await pool.query("INSERT INTO sessions (session_id, user_email) VALUES ($1, $2)", [sessionId, userId]);
  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    maxAge: SESSION_MAX_AGE_MS,
  });
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.json());
app.use(cookieParser());

// Resolves the logged-in user (if any) from the session cookie. Does not
// block anything by itself — requireLogin below decides what requires login.
async function resolveSession(req, res, next) {
  const sessionId = req.cookies[SESSION_COOKIE];
  if (sessionId) {
    try {
      const result = await pool.query("SELECT user_email FROM sessions WHERE session_id = $1", [sessionId]);
      if (result.rows.length > 0) {
        req.sessionId = sessionId;
        req.userId = result.rows[0].user_email;
      }
    } catch (err) {
      console.error("Session lookup failed:", err.message);
    }
  }
  next();
}

// Pages/requests reachable without being logged in.
const PUBLIC_PAGE_PATHS = new Set(["/login.html", "/signup.html", "/login.js", "/signup.js", "/style.css"]);

// Every other page and API route requires login. API requests get a 401 (the
// page JS already expects JSON from fetch); page loads get redirected to the
// login page.
function requireLogin(req, res, next) {
  if (req.userId) return next();
  if (req.path.startsWith("/api/auth/")) return next();
  if (PUBLIC_PAGE_PATHS.has(req.path)) return next();
  if (req.path.startsWith("/api/")) {
    return res.status(401).json({ ok: false, error: "Not authenticated" });
  }
  return res.redirect("/login.html");
}

app.use(resolveSession);
app.use(requireLogin);

app.use(express.static(path.join(__dirname, "public")));

// Every page is now an EJS view instead of a static file, rendered once a
// request has already passed the login gate above. Written as one
// data-driven loop rather than 14 near-identical app.get calls.
const PAGE_ROUTES = {
  "/": "index",
  "/index.html": "index",
  "/login.html": "login",
  "/signup.html": "signup",
  "/employment.html": "employment",
  "/income-calculations.html": "income-calculations",
  "/spouse-other-member.html": "spouse-other-member",
  "/assets.html": "assets",
  "/liabilities.html": "liabilities",
  "/questionnaire.html": "questionnaire",
  "/income.html": "income",
  "/expenses.html": "expenses",
  "/documents.html": "documents",
  "/summary.html": "summary",
};
Object.entries(PAGE_ROUTES).forEach(([route, view]) => {
  app.get(route, (req, res) => res.render(view));
});

app.use("/api/documents", createDocumentsRouter(pool, getPersonalInfoFor));

app.post("/api/auth/signup", async (req, res) => {
  const email = String((req.body && req.body.email) || "").trim().toLowerCase();
  const password = String((req.body && req.body.password) || "");

  if (!isValidEmail(email)) {
    return res.status(400).json({ ok: false, error: "Please enter a valid email address." });
  }
  if (password.length < 8) {
    return res.status(400).json({ ok: false, error: "Password must be at least 8 characters." });
  }

  try {
    const passwordHash = bcrypt.hashSync(password, 10);
    await pool.query("INSERT INTO users (email, password_hash) VALUES ($1, $2)", [email, passwordHash]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ ok: false, error: "An account with this email already exists." });
    }
    console.error("Signup failed:", err.message);
    return res.status(500).json({ ok: false, error: "Sign up failed. Please try again." });
  }

  await startSession(res, email);
  res.json({ ok: true });
});

app.post("/api/auth/login", async (req, res) => {
  const email = String((req.body && req.body.email) || "").trim().toLowerCase();
  const password = String((req.body && req.body.password) || "");

  try {
    const result = await pool.query("SELECT password_hash FROM users WHERE email = $1", [email]);
    const user = result.rows[0];
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ ok: false, error: "Invalid email or password." });
    }
  } catch (err) {
    console.error("Login failed:", err.message);
    return res.status(500).json({ ok: false, error: "Login failed. Please try again." });
  }

  await startSession(res, email);
  res.json({ ok: true });
});

app.post("/api/auth/logout", async (req, res) => {
  if (req.sessionId) {
    await pool.query("DELETE FROM sessions WHERE session_id = $1", [req.sessionId]);
  }
  res.clearCookie(SESSION_COOKIE);
  res.json({ ok: true });
});

app.get("/api/auth/me", (req, res) => {
  res.json({ loggedIn: Boolean(req.userId), email: req.userId || null });
});

// Blocks a POST until an earlier step's data exists, with a 409 + message —
// replaces what used to be a copy-pasted `if (!data.xxx)` in six handlers.
function requirePriorStep(stepKey, message) {
  return (req, res, next) => {
    if (!getSessionData(req)[stepKey]) {
      return res.status(409).json({ ok: false, error: message });
    }
    next();
  };
}

// Same idea, but for the PDF export, which needs every step done at once.
function requireAllSteps(req, res, next) {
  const data = getSessionData(req);
  const missing = ALL_STEPS.some((step) => !data[step]);
  if (missing) {
    return res.status(409).json({
      ok: false,
      error:
        "Submit personal, spouse & other member, employment, income calculations, assets, liabilities, questionnaire, income, and expenses info first.",
    });
  }
  next();
}

app.get("/api/status", (req, res) => {
  const data = getSessionData(req);
  const status = {};
  ALL_STEPS.forEach((step) => {
    status[`${step}Submitted`] = Boolean(data[step]);
  });
  res.json(status);
});

app.get("/api/data", (req, res) => {
  res.json(getSessionData(req));
});

app.post("/api/personal", (req, res) => {
  updateSessionData(req, { personal: req.body });
  res.json({ ok: true });
});

app.post(
  "/api/spouse-other-member",
  requirePriorStep("personal", "Personal info must be submitted first."),
  (req, res) => {
    updateSessionData(req, { spouseOtherMember: req.body });
    res.json({ ok: true });
  }
);

app.post(
  "/api/employment",
  requirePriorStep("spouseOtherMember", "Spouse & Other Member info must be submitted first."),
  (req, res) => {
    updateSessionData(req, { employment: req.body });
    res.json({ ok: true });
  }
);

app.post(
  "/api/income-calculations",
  requirePriorStep("employment", "Employment info must be submitted first."),
  (req, res) => {
    updateSessionData(req, { incomeCalculations: req.body });
    res.json({ ok: true });
  }
);

app.post(
  "/api/assets",
  requirePriorStep("incomeCalculations", "Income Calculations must be submitted first."),
  (req, res) => {
    updateSessionData(req, { assets: req.body });
    res.json({ ok: true });
  }
);

app.post("/api/liabilities", requirePriorStep("assets", "Assets info must be submitted first."), (req, res) => {
  updateSessionData(req, { liabilities: req.body });
  res.json({ ok: true });
});

app.post(
  "/api/questionnaire",
  requirePriorStep("liabilities", "Liabilities info must be submitted first."),
  (req, res) => {
    updateSessionData(req, { questionnaire: req.body });
    res.json({ ok: true });
  }
);

// Not gated on Questionnaire: Income Calculations and Spouse & Other Member Info
// (which now come earlier in the flow) need to push computed totals into this
// record before the user has necessarily reached the Income page themselves.
app.post("/api/income", (req, res) => {
  updateSessionData(req, { income: req.body });
  res.json({ ok: true });
});

app.post("/api/expenses", requirePriorStep("income", "Income info must be submitted first."), (req, res) => {
  updateSessionData(req, { expenses: req.body });
  res.json({ ok: true });
});

app.get("/api/pdf", requireAllSteps, (req, res) => {
  renderFilingSummaryPdf(res, getSessionData(req));
});

initSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to Postgres / initialize schema:", err.message);
    process.exit(1);
  });

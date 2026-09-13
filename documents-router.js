const path = require("path");
const fs = require("fs");
const express = require("express");
const multer = require("multer");

const DOCS_ROOT = path.resolve(process.env.DOCS_ROOT || path.join(__dirname, "uploads"));

function sanitizeForPath(str) {
  return (
    String(str || "")
      .trim()
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, " ")
      .slice(0, 60) || "Unnamed"
  );
}

function sanitizeFilename(name) {
  return path.basename(String(name || "file")).replace(/[\\/:*?"<>|]/g, "_");
}

// Builds an Express router for the Documents feature. Takes the shared pg
// Pool and a getPersonalInfoFor(userId) callback (server.js owns data.json).
module.exports = function createDocumentsRouter(pool, getPersonalInfoFor) {
  const router = express.Router();

  fs.mkdirSync(DOCS_ROOT, { recursive: true });

  // Resolves (and persists) the folder name for this account, reusing it on
  // every later call instead of recomputing — so it stays stable even if the
  // client's name is edited after the first upload.
  async function resolveFolderName(userId) {
    const existing = await pool.query("SELECT folder_name FROM users WHERE email = $1", [userId]);
    const current = existing.rows[0] && existing.rows[0].folder_name;
    if (current) return current;

    const personal = getPersonalInfoFor(userId) || {};
    const last = sanitizeForPath(personal.lastName);
    const first = sanitizeForPath(personal.firstName);
    const base = `${last}_${first}`;

    let candidate = base;
    let suffix = 2;
    // Loop guards against two different accounts landing on the same name.
    for (;;) {
      const clash = await pool.query("SELECT 1 FROM users WHERE folder_name = $1 AND email != $2", [
        candidate,
        userId,
      ]);
      if (clash.rows.length === 0) break;
      candidate = `${base}_${suffix}`;
      suffix += 1;
    }

    await pool.query("UPDATE users SET folder_name = $1 WHERE email = $2", [candidate, userId]);
    return candidate;
  }

  // Resolves/creates the case folder up front so both multer's storage engine
  // and the DB insert below can rely on req.caseFolderPath being set.
  async function ensureFolder(req, res, next) {
    try {
      const folderName = await resolveFolderName(req.userId);
      const folderPath = path.join(DOCS_ROOT, folderName);
      fs.mkdirSync(folderPath, { recursive: true });
      req.caseFolderPath = folderPath;
      next();
    } catch (err) {
      console.error("Failed to prepare upload folder:", err.message);
      res.status(500).json({ ok: false, error: "Could not prepare the upload folder." });
    }
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, req.caseFolderPath),
    filename: (req, file, cb) => {
      const category = sanitizeForPath(req.body.category);
      cb(null, `${category} - ${Date.now()}-${sanitizeFilename(file.originalname)}`);
    },
  });

  const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

  router.post("/", ensureFolder, upload.array("files", 20), async (req, res) => {
    const category = String(req.body.category || "Document").slice(0, 100);
    try {
      for (const file of req.files) {
        await pool.query(
          "INSERT INTO documents (user_email, category, original_filename, stored_filename) VALUES ($1, $2, $3, $4)",
          [req.userId, category, file.originalname, file.filename]
        );
      }
      res.json({ ok: true, files: req.files.map((f) => f.filename) });
    } catch (err) {
      console.error("Failed to record uploaded documents:", err.message);
      res.status(500).json({ ok: false, error: "Failed to save uploaded documents." });
    }
  });

  router.get("/", async (req, res) => {
    const result = await pool.query(
      "SELECT id, category, original_filename, uploaded_at FROM documents WHERE user_email = $1 ORDER BY uploaded_at DESC",
      [req.userId]
    );
    res.json(result.rows);
  });

  router.delete("/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ ok: false, error: "Invalid document id." });
    }

    const docResult = await pool.query("SELECT stored_filename FROM documents WHERE id = $1 AND user_email = $2", [
      id,
      req.userId,
    ]);
    if (docResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Document not found." });
    }

    const userResult = await pool.query("SELECT folder_name FROM users WHERE email = $1", [req.userId]);
    const folderPath = path.join(DOCS_ROOT, userResult.rows[0].folder_name || "");
    const filePath = path.join(folderPath, docResult.rows[0].stored_filename);

    // Defends against a stored_filename ever containing path segments that
    // would resolve outside this user's own folder.
    if (path.dirname(filePath) !== folderPath) {
      return res.status(400).json({ ok: false, error: "Invalid file path." });
    }

    fs.unlink(filePath, () => {});
    await pool.query("DELETE FROM documents WHERE id = $1", [id]);
    res.json({ ok: true });
  });

  return router;
};

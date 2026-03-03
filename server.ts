import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import crypto from "crypto";
import path from "path";

const db = new Database("esg_verify.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS verification_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    report_name TEXT,
    claim_count INTEGER,
    hash TEXT,
    previous_hash TEXT
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/logs", (req, res) => {
    const logs = db.prepare("SELECT * FROM verification_logs ORDER BY timestamp DESC").all();
    res.json(logs);
  });

  app.post("/api/logs", (req, res) => {
    const { reportName, claimCount } = req.body;
    
    // Get last hash
    const lastLog = db.prepare("SELECT hash FROM verification_logs ORDER BY timestamp DESC LIMIT 1").get() as { hash: string } | undefined;
    const previousHash = lastLog?.hash || "0".repeat(64);
    
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    // Create new hash: hash(id + timestamp + reportName + claimCount + previousHash)
    const dataToHash = `${id}${timestamp}${reportName}${claimCount}${previousHash}`;
    const hash = crypto.createHash("sha256").update(dataToHash).digest("hex");
    
    db.prepare(`
      INSERT INTO verification_logs (id, timestamp, report_name, claim_count, hash, previous_hash)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, timestamp, reportName, claimCount, hash, previousHash);
    
    res.json({ id, timestamp, hash, previousHash });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

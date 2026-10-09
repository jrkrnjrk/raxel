const express = require("express");
const crypto = require("crypto");
const config = require("./config");
const db = require("./db");

function secretOk(header) {
  if (!config.apiSecret) return false;
  const given = Buffer.from(String(header || ""));
  const expected = Buffer.from(config.apiSecret);
  if (given.length !== expected.length) return false;
  return crypto.timingSafeEqual(given, expected);
}

function createApi() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/", (_req, res) => {
    res.type("text").send("Group bot is online.");
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true, groupId: config.groupId });
  });

  app.get("/api/lockdown", (req, res) => {
    if (!secretOk(req.get("x-api-secret"))) return res.status(401).json({ error: "bad secret" });
    res.json({ locked: db.getLockdown(), minRank: config.lockdownMinRank, groupId: config.groupId });
  });

  app.post("/api/activity", async (req, res) => {
    if (!secretOk(req.get("x-api-secret") || req.body?.secret)) return res.status(401).json({ error: "bad secret" });
    const updates = Array.isArray(req.body?.updates) ? req.body.updates : [];
    let saved = 0;
    for (const update of updates.slice(0, 100)) {
      const userId = Number(update.userId);
      const seconds = Number(update.seconds);
      if (!userId || !seconds || seconds < 0 || seconds > 86400) continue;
      await db.addActivity(userId, String(update.username || "").slice(0, 32), Math.floor(seconds));
      saved += 1;
    }
    if (saved) console.log(`Activity saved for ${saved} player(s)`);
    res.json({ ok: true, saved });
  });

  app.post("/api/chatlogs", async (req, res) => {
    if (!secretOk(req.get("x-api-secret") || req.body?.secret)) return res.status(401).json({ error: "bad secret" });
    const entries = Array.isArray(req.body?.entries) ? req.body.entries : [req.body];
    for (const entry of entries.slice(0, 50)) {
      const message = String(entry.message || "").slice(0, 500);
      const userId = Number(entry.userId);
      if (!userId || !message) continue;
      await db.addChatlog({
        userId,
        username: String(entry.username || "Unknown").slice(0, 32),
        message,
        placeId: Number(entry.placeId) || 0,
        time: Number(entry.time) || Math.floor(Date.now() / 1000),
      });
    }
    res.json({ ok: true });
  });

  return app;
}

module.exports = { createApi };

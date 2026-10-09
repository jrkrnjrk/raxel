const fs = require("fs");
const path = require("path");
const config = require("./config");

function load(name) {
  const file = path.join(__dirname, "..", "roblox-scripts", name);
  return fs.readFileSync(file, "utf8")
    .replaceAll("{{API_URL}}", config.publicUrl || "https://YOUR_RAILWAY_DOMAIN")
    .replaceAll("{{API_SECRET}}", config.apiSecret || "YOUR_API_SECRET")
    .replaceAll("{{GROUP_ID}}", String(config.groupId))
    .replaceAll("{{MIN_RANK}}", String(config.lockdownMinRank));
}

function activityScript() {
  return load("ActivityTracker.server.lua");
}

function chatlogScript() {
  return load("ChatLogger.server.lua");
}

function lockdownScript() {
  return load("Lockdown.server.lua");
}

module.exports = { activityScript, chatlogScript, lockdownScript };

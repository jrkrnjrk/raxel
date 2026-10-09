require("dotenv").config();
const fs = require("fs");

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

function resolveDataDir() {
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  if (fs.existsSync("/data")) return "/data";
  return require("path").join(process.cwd(), "data");
}

function publicUrl() {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  return "";
}

const config = {
  discordToken: required("DISCORD_TOKEN"),
  guildId: process.env.GUILD_ID || "",
  groupId: process.env.GROUP_ID || "186309460",
  robloxCookie: (process.env.ROBLOX_COOKIE || "").replace(/^\.ROBLOSECURITY=/, "").trim(),
  apiSecret: process.env.API_SECRET || "",
  staffRoleIds: (process.env.STAFF_ROLE_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
  logChannelId: process.env.LOG_CHANNEL_ID || "",
  publicUrl: publicUrl(),
  dataDir: resolveDataDir(),
  port: Number(process.env.PORT || 3000),
  lockdownMinRank: Number(process.env.LOCKDOWN_MIN_RANK || 100),
};

module.exports = config;

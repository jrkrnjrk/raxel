const fs = require("fs");
const path = require("path");
const config = require("./config");

const filePath = path.join(config.dataDir, "store.json");

const empty = () => ({
  links: {},
  pending: {},
  activity: {},
  chatlogs: [],
});

let store = empty();
let writing = Promise.resolve();

function load() {
  fs.mkdirSync(config.dataDir, { recursive: true });
  if (!fs.existsSync(filePath)) {
    store = empty();
    return;
  }
  try {
    store = { ...empty(), ...JSON.parse(fs.readFileSync(filePath, "utf8")) };
    if (!Array.isArray(store.chatlogs)) store.chatlogs = [];
  } catch (error) {
    console.error("Failed to read store, starting fresh:", error.message);
    store = empty();
  }
}

function save() {
  writing = writing.then(() => {
    const tmp = `${filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(store));
    fs.renameSync(tmp, filePath);
  }).catch((error) => {
    console.error("Failed to save store:", error.message);
  });
  return writing;
}

function getLink(discordId) {
  return store.links[discordId] || null;
}

function setLink(discordId, link) {
  store.links[discordId] = link;
  delete store.pending[discordId];
  return save();
}

function getPending(discordId) {
  return store.pending[discordId] || null;
}

function setPending(discordId, pending) {
  store.pending[discordId] = pending;
  return save();
}

function addActivity(userId, username, seconds) {
  const key = String(userId);
  const current = store.activity[key] || { userId: Number(userId), username, seconds: 0 };
  current.username = username || current.username;
  current.seconds += Number(seconds) || 0;
  current.updatedAt = new Date().toISOString();
  store.activity[key] = current;
  return save();
}

function resetActivity() {
  store.activity = {};
  return save();
}

function getActivity(userId) {
  return store.activity[String(userId)] || null;
}

function topActivity(limit = 10) {
  return Object.values(store.activity)
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, limit);
}

function addChatlog(entry) {
  store.chatlogs.push(entry);
  if (store.chatlogs.length > 2000) {
    store.chatlogs = store.chatlogs.slice(-2000);
  }
  return save();
}

function latestChatlogs(limit = 100) {
  return store.chatlogs.slice(-limit);
}

load();

module.exports = {
  getLink,
  setLink,
  getPending,
  setPending,
  addActivity,
  resetActivity,
  getActivity,
  topActivity,
  addChatlog,
  latestChatlogs,
};

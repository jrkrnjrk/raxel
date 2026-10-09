const config = require("./config");

const GROUP_ID = config.groupId;

async function robloxFetch(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  if (!response.ok) {
    const message = body?.errors?.[0]?.message || body?.message || body?.raw || response.statusText;
    const error = new Error(message || `Roblox API ${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

async function usernameToUser(username) {
  const clean = String(username || "").replace(/^@/, "").trim();
  if (!clean) throw new Error("Username is required.");
  const body = await robloxFetch("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernames: [clean], excludeBannedUsers: false }),
  });
  const user = body?.data?.[0];
  if (!user) throw new Error(`No Roblox user named \`${clean}\`.`);
  return { id: user.id, name: user.name, displayName: user.displayName };
}

async function getUser(userId) {
  return robloxFetch(`https://users.roblox.com/v1/users/${userId}`);
}

async function getRoles() {
  const body = await robloxFetch(`https://groups.roblox.com/v1/groups/${GROUP_ID}/roles`);
  return (body.roles || []).slice().sort((a, b) => a.rank - b.rank);
}

let csrfToken = "";

function cookieHeader() {
  if (!config.robloxCookie) throw new Error("ROBLOX_COOKIE is not set.");
  return `.ROBLOSECURITY=${config.robloxCookie}`;
}

async function cookieFetch(url, options = {}, retry = true) {
  const headers = {
    Cookie: cookieHeader(),
    "User-Agent": "Mozilla/5.0",
    ...(options.headers || {}),
  };
  if (csrfToken) headers["X-CSRF-TOKEN"] = csrfToken;
  const response = await fetch(url, { ...options, headers });
  const fresh = response.headers.get("x-csrf-token");
  if (fresh) csrfToken = fresh;
  if (response.status === 403 && fresh && retry) {
    return cookieFetch(url, options, false);
  }
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  if (!response.ok) {
    const message = body?.errors?.[0]?.message || body?.message || body?.raw || response.statusText;
    const error = new Error(message || `Roblox API ${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

async function setRole(userId, roleId) {
  return cookieFetch(`https://groups.roblox.com/v1/groups/${GROUP_ID}/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roleId: Number(roleId) }),
  });
}

async function banFromGroup(userId, reason) {
  return cookieFetch(`https://groups.roblox.com/v1/groups/${GROUP_ID}/bans/${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reason ? { reason: String(reason).slice(0, 200) } : {}),
  });
}

async function unbanFromGroup(userId) {
  return cookieFetch(`https://groups.roblox.com/v1/groups/${GROUP_ID}/bans/${userId}`, {
    method: "DELETE",
  });
}

async function authenticatedUser() {
  return cookieFetch("https://users.roblox.com/v1/users/authenticated");
}

async function getUserGroupRole(userId) {
  const body = await robloxFetch(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);
  const entry = (body.data || []).find((item) => String(item.group?.id) === String(GROUP_ID));
  if (!entry) return null;
  return {
    groupName: entry.group.name,
    roleId: entry.role.id,
    roleName: entry.role.name,
    rank: entry.role.rank,
  };
}

function assignableRoles(roles) {
  return roles.filter((role) => role.rank > 0 && role.rank < 255);
}

function findRole(roles, rankInput) {
  const raw = String(rankInput || "").trim();
  if (!raw) throw new Error("Rank is required.");
  if (/^\d+$/.test(raw)) {
    const number = Number(raw);
    const byRank = roles.find((role) => role.rank === number);
    if (byRank) return byRank;
    const byId = roles.find((role) => String(role.id) === raw);
    if (byId) return byId;
  }
  const lowered = raw.toLowerCase();
  const byName = roles.find((role) => role.name.toLowerCase() === lowered);
  if (byName) return byName;
  throw new Error(`No role named or numbered \`${raw}\`.`);
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return `${hours} hour${hours === 1 ? "" : "s"} ${minutes} minute${minutes === 1 ? "" : "s"}`;
}

module.exports = {
  usernameToUser,
  getUser,
  getRoles,
  setRole,
  banFromGroup,
  unbanFromGroup,
  authenticatedUser,
  getUserGroupRole,
  assignableRoles,
  findRole,
  formatDuration,
};

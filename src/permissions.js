const { PermissionFlagsBits } = require("discord.js");
const config = require("./config");

function isStaff(interaction) {
  if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return true;
  if (!config.staffRoleIds.length) return false;
  return config.staffRoleIds.some((id) => interaction.member?.roles?.cache?.has(id));
}

function assertStaff(interaction) {
  if (!isStaff(interaction)) {
    throw new Error("You need Administrator or a staff role to use this.");
  }
}

module.exports = { isStaff, assertStaff };

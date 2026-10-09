const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, AttachmentBuilder } = require("discord.js");
const config = require("./config");
const db = require("./db");
const roblox = require("./roblox");
const { assertStaff } = require("./permissions");
const { lockdownScript } = require("./scripts");

const staff = PermissionFlagsBits.Administrator;

function reasonOf(interaction) {
  return interaction.options.getString("reason") || "No reason given";
}

async function memberOf(interaction, user) {
  return interaction.guild.members.fetch(user.id);
}

const commands = [
  {
    data: new SlashCommandBuilder()
      .setName("purge")
      .setDescription("Delete recent messages in this channel")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
      .addIntegerOption((option) => option.setName("amount").setDescription("How many messages, up to 100").setRequired(true).setMinValue(1).setMaxValue(100)),
    async execute(interaction) {
      assertStaff(interaction);
      const amount = interaction.options.getInteger("amount");
      const deleted = await interaction.channel.bulkDelete(amount, true);
      await interaction.reply({ ephemeral: true, content: `Deleted ${deleted.size} messages. Messages older than 14 days are skipped.` });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("ban")
      .setDescription("Ban a member from this Discord server")
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addUserOption((option) => option.setName("user").setDescription("Member to ban").setRequired(true))
      .addStringOption((option) => option.setName("reason").setDescription("Reason"))
      .addIntegerOption((option) => option.setName("delete_days").setDescription("Delete their messages from the last 0-7 days").setMinValue(0).setMaxValue(7)),
    async execute(interaction) {
      assertStaff(interaction);
      const user = interaction.options.getUser("user");
      const days = interaction.options.getInteger("delete_days") || 0;
      await interaction.guild.members.ban(user.id, { deleteMessageSeconds: days * 86400, reason: reasonOf(interaction) });
      await interaction.reply(`Banned **${user.tag}**. ${reasonOf(interaction)}`);
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("kick")
      .setDescription("Kick a member from this Discord server")
      .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
      .addUserOption((option) => option.setName("user").setDescription("Member to kick").setRequired(true))
      .addStringOption((option) => option.setName("reason").setDescription("Reason")),
    async execute(interaction) {
      assertStaff(interaction);
      const user = interaction.options.getUser("user");
      const member = await memberOf(interaction, user);
      await member.kick(reasonOf(interaction));
      await interaction.reply(`Kicked **${user.tag}**. ${reasonOf(interaction)}`);
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("warn")
      .setDescription("Warn a member")
      .setDefaultMemberPermissions(staff)
      .addUserOption((option) => option.setName("user").setDescription("Member to warn").setRequired(true))
      .addStringOption((option) => option.setName("reason").setDescription("Reason").setRequired(true)),
    async execute(interaction) {
      assertStaff(interaction);
      const user = interaction.options.getUser("user");
      const warning = await db.addWarning(interaction.guildId, user.id, {
        reason: reasonOf(interaction),
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.tag,
      });
      await interaction.reply(`Warned **${user.tag}** (#${warning.id}). ${warning.reason}`);
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("infractions")
      .setDescription("Show a member's warnings")
      .setDefaultMemberPermissions(staff)
      .addUserOption((option) => option.setName("user").setDescription("Member").setRequired(true)),
    async execute(interaction) {
      assertStaff(interaction);
      const user = interaction.options.getUser("user");
      const warnings = db.getWarnings(interaction.guildId, user.id);
      const lines = warnings.length
        ? warnings.map((warning) => `#${warning.id} — ${warning.reason} (${warning.moderatorTag}, ${warning.createdAt})`).join("\n")
        : "No warnings.";
      await interaction.reply({
        ephemeral: true,
        embeds: [new EmbedBuilder().setColor(0xfee75c).setTitle(`${user.tag} — ${warnings.length} warning(s)`).setDescription(lines.slice(0, 4000))],
      });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("unwarn")
      .setDescription("Remove a warning by id")
      .setDefaultMemberPermissions(staff)
      .addUserOption((option) => option.setName("user").setDescription("Member").setRequired(true))
      .addIntegerOption((option) => option.setName("id").setDescription("Warning id from /infractions").setRequired(true).setMinValue(1)),
    async execute(interaction) {
      assertStaff(interaction);
      const user = interaction.options.getUser("user");
      const removed = await db.removeWarning(interaction.guildId, user.id, interaction.options.getInteger("id"));
      if (!removed) throw new Error("That warning id was not found for this member.");
      await interaction.reply(`Removed warning #${interaction.options.getInteger("id")} from **${user.tag}**.`);
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("unban")
      .setDescription("Unban a user from this Discord server")
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addStringOption((option) => option.setName("userid").setDescription("Discord user id").setRequired(true))
      .addStringOption((option) => option.setName("reason").setDescription("Reason")),
    async execute(interaction) {
      assertStaff(interaction);
      const userId = interaction.options.getString("userid").replace(/\D/g, "");
      if (!userId) throw new Error("That is not a user id.");
      await interaction.guild.members.unban(userId, reasonOf(interaction));
      await interaction.reply(`Unbanned \`${userId}\`.`);
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("mute")
      .setDescription("Timeout a member")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption((option) => option.setName("user").setDescription("Member to mute").setRequired(true))
      .addIntegerOption((option) => option.setName("minutes").setDescription("Timeout length in minutes, max 40320").setRequired(true).setMinValue(1).setMaxValue(40320))
      .addStringOption((option) => option.setName("reason").setDescription("Reason")),
    async execute(interaction) {
      assertStaff(interaction);
      const user = interaction.options.getUser("user");
      const minutes = interaction.options.getInteger("minutes");
      const member = await memberOf(interaction, user);
      await member.timeout(minutes * 60 * 1000, reasonOf(interaction));
      await interaction.reply(`Muted **${user.tag}** for ${minutes} minute(s). ${reasonOf(interaction)}`);
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("unmute")
      .setDescription("Remove a member's timeout")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption((option) => option.setName("user").setDescription("Member to unmute").setRequired(true)),
    async execute(interaction) {
      assertStaff(interaction);
      const user = interaction.options.getUser("user");
      const member = await memberOf(interaction, user);
      await member.timeout(null);
      await interaction.reply(`Unmuted **${user.tag}**.`);
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("softban")
      .setDescription("Ban and immediately unban, which deletes recent messages")
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addUserOption((option) => option.setName("user").setDescription("Member to softban").setRequired(true))
      .addStringOption((option) => option.setName("reason").setDescription("Reason")),
    async execute(interaction) {
      assertStaff(interaction);
      await interaction.deferReply();
      const user = interaction.options.getUser("user");
      const reason = reasonOf(interaction);
      await interaction.guild.members.ban(user.id, { deleteMessageSeconds: 7 * 86400, reason });
      await interaction.guild.members.unban(user.id, reason);
      await interaction.editReply(`Softbanned **${user.tag}**. Their messages from the last 7 days were deleted. ${reason}`);
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("community-ban")
      .setDescription("Ban a Roblox user from the group")
      .setDefaultMemberPermissions(staff)
      .addStringOption((option) => option.setName("username").setDescription("Roblox username").setRequired(true))
      .addStringOption((option) => option.setName("reason").setDescription("Reason")),
    async execute(interaction) {
      assertStaff(interaction);
      await interaction.deferReply();
      const user = await roblox.usernameToUser(interaction.options.getString("username"));
      await roblox.banFromGroup(user.id, interaction.options.getString("reason"));
      await interaction.editReply(`Banned **${user.name}** (${user.id}) from the group.`);
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("community-unban")
      .setDescription("Unban a Roblox user from the group")
      .setDefaultMemberPermissions(staff)
      .addStringOption((option) => option.setName("username").setDescription("Roblox username").setRequired(true)),
    async execute(interaction) {
      assertStaff(interaction);
      await interaction.deferReply();
      const user = await roblox.usernameToUser(interaction.options.getString("username"));
      await roblox.unbanFromGroup(user.id);
      await interaction.editReply(`Unbanned **${user.name}** (${user.id}) from the group.`);
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("lockdown")
      .setDescription("Only rank 100+ can join the game while this is on")
      .setDefaultMemberPermissions(staff)
      .addBooleanOption((option) => option.setName("enabled").setDescription("Turn lockdown on or off").setRequired(true)),
    async execute(interaction) {
      assertStaff(interaction);
      const enabled = interaction.options.getBoolean("enabled");
      await db.setLockdown(enabled);
      await interaction.reply(enabled
        ? `Lockdown is on. Rank ${config.lockdownMinRank}+ in the group can stay in the game.`
        : "Lockdown is off.");
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("lockdown-script")
      .setDescription("Get the Studio script that enforces lockdown")
      .setDefaultMemberPermissions(staff),
    async execute(interaction) {
      assertStaff(interaction);
      const file = new AttachmentBuilder(Buffer.from(lockdownScript(), "utf8"), { name: "Lockdown.server.lua" });
      await interaction.reply({
        ephemeral: true,
        content: "Put `Lockdown.server.lua` in ServerScriptService. It checks the bot every 15 seconds and kicks anyone under the lockdown rank.",
        files: [file],
      });
    },
  },
];

module.exports = { commands };

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} = require("discord.js");
const config = require("./config");
const db = require("./db");
const roblox = require("./roblox");
const { assertStaff } = require("./permissions");
const { activityScript, chatlogScript } = require("./scripts");

const staff = PermissionFlagsBits.Administrator;

async function resolveUser(interaction) {
  return roblox.usernameToUser(interaction.options.getString("username"));
}

async function changeRank(interaction, pickRole) {
  assertStaff(interaction);
  await interaction.deferReply();
  const user = await resolveUser(interaction);
  const roles = await roblox.getRoles();
  const current = await roblox.getUserGroupRole(user.id);
  if (!current) throw new Error(`${user.name} is not in the group.`);
  const next = pickRole(roles, current);
  if (next.rank === 0 || next.rank === 255) {
    throw new Error("The cookie account cannot assign Guest or Owner. Pick another rank.");
  }
  await roblox.setRole(user.id, next.id);
  return { user, current, next };
}

function rankEmbed(title, user, current, next) {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(title)
    .setDescription(`**${user.name}** (${user.id})`)
    .addFields(
      { name: "From", value: `${current.roleName} (${current.rank})`, inline: true },
      { name: "To", value: `${next.name} (${next.rank})`, inline: true }
    );
}

const commands = [
  {
    data: new SlashCommandBuilder()
      .setName("terminate")
      .setDescription("Set a member to the lowest rank in the group")
      .setDefaultMemberPermissions(staff)
      .addStringOption((option) => option.setName("username").setDescription("Roblox username").setRequired(true)),
    async execute(interaction) {
      const result = await changeRank(interaction, (roles) => {
        const assignable = roblox.assignableRoles(roles);
        if (!assignable.length) throw new Error("No assignable ranks found.");
        return assignable[0];
      });
      await interaction.editReply({ embeds: [rankEmbed("Terminated", result.user, result.current, result.next)] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("promote")
      .setDescription("Promote a member one rank")
      .setDefaultMemberPermissions(staff)
      .addStringOption((option) => option.setName("username").setDescription("Roblox username").setRequired(true)),
    async execute(interaction) {
      const result = await changeRank(interaction, (roles, current) => {
        const assignable = roblox.assignableRoles(roles);
        const index = assignable.findIndex((role) => role.rank === current.rank || role.id === current.roleId);
        if (index === -1) throw new Error(`${current.roleName} cannot be changed by this bot.`);
        const next = assignable[index + 1];
        if (!next) throw new Error(`${current.roleName} is already the highest rank this bot can set.`);
        return next;
      });
      await interaction.editReply({ embeds: [rankEmbed("Promoted", result.user, result.current, result.next)] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("demote")
      .setDescription("Demote a member one rank")
      .setDefaultMemberPermissions(staff)
      .addStringOption((option) => option.setName("username").setDescription("Roblox username").setRequired(true)),
    async execute(interaction) {
      const result = await changeRank(interaction, (roles, current) => {
        const assignable = roblox.assignableRoles(roles);
        const index = assignable.findIndex((role) => role.rank === current.rank || role.id === current.roleId);
        if (index <= 0) throw new Error(`${current.roleName} is already the lowest rank this bot can set.`);
        return assignable[index - 1];
      });
      await interaction.editReply({ embeds: [rankEmbed("Demoted", result.user, result.current, result.next)] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("setrank")
      .setDescription("Set a member to a rank by name, rank number, or role id")
      .setDefaultMemberPermissions(staff)
      .addStringOption((option) => option.setName("username").setDescription("Roblox username").setRequired(true))
      .addStringOption((option) => option.setName("rank").setDescription("Rank name, rank number, or role id").setRequired(true)),
    async execute(interaction) {
      assertStaff(interaction);
      await interaction.deferReply();
      const user = await resolveUser(interaction);
      const roles = await roblox.getRoles();
      const current = await roblox.getUserGroupRole(user.id);
      if (!current) throw new Error(`${user.name} is not in the group.`);
      const next = roblox.findRole(roles, interaction.options.getString("rank"));
      if (next.rank === 0 || next.rank === 255) {
        throw new Error("The cookie account cannot assign Guest or Owner.");
      }
      await roblox.setRole(user.id, next.id);
      await interaction.editReply({ embeds: [rankEmbed("Rank set", user, current, next)] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("activity-script")
      .setDescription("Get the Roblox Studio script that tracks activity")
      .setDefaultMemberPermissions(staff),
    async execute(interaction) {
      assertStaff(interaction);
      const file = new AttachmentBuilder(Buffer.from(activityScript(), "utf8"), { name: "ActivityTracker.server.lua" });
      await interaction.reply({
        ephemeral: true,
        content: [
          "Put `ActivityTracker.server.lua` in **ServerScriptService**.",
          "In Game Settings, turn on **Allow HTTP Requests** and allow this bot's domain.",
          config.publicUrl ? `Endpoint: \`${config.publicUrl}/api/activity\`` : "Set `PUBLIC_URL` so the script is filled in.",
        ].join("\n"),
        files: [file],
      });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("activity-reset")
      .setDescription("Reset activity for everyone in the group")
      .setDefaultMemberPermissions(staff),
    async execute(interaction) {
      assertStaff(interaction);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("activity_reset_confirm").setLabel("Reset all activity").setStyle(ButtonStyle.Danger)
      );
      await interaction.reply({
        ephemeral: true,
        content: "This clears stored playtime for every player. It does not change group ranks.",
        components: [row],
      });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("activity-user")
      .setDescription("Show how long a player has been tracked in-game")
      .addStringOption((option) => option.setName("username").setDescription("Roblox username").setRequired(true)),
    async execute(interaction) {
      await interaction.deferReply();
      const user = await resolveUser(interaction);
      const activity = db.getActivity(user.id);
      const seconds = activity?.seconds || 0;
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle(user.name)
            .setDescription(roblox.formatDuration(seconds))
            .setFooter({ text: "Tracked in-game time" }),
        ],
      });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("myinfo")
      .setDescription("Show your verified Roblox rank in the group"),
    async execute(interaction) {
      await interaction.deferReply({ ephemeral: true });
      const link = db.getLink(interaction.user.id);
      if (!link) throw new Error("You are not verified. Use `/verify` first.");
      const role = await roblox.getUserGroupRole(link.robloxId);
      const activity = db.getActivity(link.robloxId);
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(link.robloxName)
        .addFields(
          { name: "Roblox id", value: String(link.robloxId), inline: true },
          { name: "Group", value: role?.groupName || config.groupId, inline: true },
          { name: "Rank", value: role ? `${role.roleName} (${role.rank})` : "Not in the group", inline: true },
          { name: "Activity", value: roblox.formatDuration(activity?.seconds || 0), inline: true }
        );
      await interaction.editReply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("verify")
      .setDescription("Link your Discord account to a Roblox account")
      .addStringOption((option) => option.setName("username").setDescription("Your Roblox username").setRequired(true)),
    async execute(interaction) {
      await interaction.deferReply({ ephemeral: true });
      const user = await resolveUser(interaction);
      const code = `RG-${interaction.user.id.slice(-4)}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      await db.setPending(interaction.user.id, {
        code,
        robloxId: user.id,
        robloxName: user.name,
        createdAt: new Date().toISOString(),
      });
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("verify_confirm").setLabel("I put it there").setStyle(ButtonStyle.Success)
      );
      const embed = new EmbedBuilder()
        .setColor(0xfee75c)
        .setTitle("Verify your Roblox account")
        .setDescription(`Put this code in the **About** section of your Roblox profile, then press the button.\n\n\`${code}\``)
        .addFields({ name: "Account", value: `${user.name} (${user.id})` })
        .setFooter({ text: "The code can be removed after verification." });
      try {
        await interaction.user.send({ embeds: [embed], components: [row] });
        await interaction.editReply("I sent the code and button in your DMs.");
      } catch {
        await interaction.editReply({
          content: "I could not DM you, so the code is here instead. Open your DMs if you want it private next time.",
          embeds: [embed],
          components: [row],
        });
      }
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("highest-activity")
      .setDescription("Show the player with the most tracked activity"),
    async execute(interaction) {
      const top = db.topActivity(5);
      if (!top.length) {
        await interaction.reply({ ephemeral: true, content: "No activity has been tracked yet." });
        return;
      }
      const [best] = top;
      const lines = top.map((entry, index) => `${index + 1}. **${entry.username}** — ${roblox.formatDuration(entry.seconds)}`);
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle(`Highest activity: ${best.username}`)
            .setDescription(roblox.formatDuration(best.seconds))
            .addFields({ name: "Top 5", value: lines.join("\n") }),
        ],
      });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("chatlogs")
      .setDescription("Download the latest 100 tracked chat messages")
      .setDefaultMemberPermissions(staff),
    async execute(interaction) {
      assertStaff(interaction);
      await interaction.deferReply({ ephemeral: true });
      const logs = db.latestChatlogs(100);
      if (!logs.length) throw new Error("No chat logs yet. Put the chat log script in the game first.");
      const text = logs.map((entry) => {
        const time = new Date(entry.time * 1000).toISOString();
        return `[${time}] ${entry.username} (${entry.userId}) [place ${entry.placeId}]: ${entry.message}`;
      }).join("\n");
      const file = new AttachmentBuilder(Buffer.from(text, "utf8"), { name: "chatlogs.txt" });
      await interaction.editReply({ content: `Latest ${logs.length} messages.`, files: [file] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("chatlogs-script")
      .setDescription("Get the Roblox Studio script that tracks chat logs")
      .setDefaultMemberPermissions(staff),
    async execute(interaction) {
      assertStaff(interaction);
      const file = new AttachmentBuilder(Buffer.from(chatlogScript(), "utf8"), { name: "ChatLogger.server.lua" });
      await interaction.reply({
        ephemeral: true,
        content: [
          "Put `ChatLogger.server.lua` in **ServerScriptService**.",
          "Turn on **Allow HTTP Requests** and allow this bot's domain.",
          config.publicUrl ? `Endpoint: \`${config.publicUrl}/api/chatlogs\`` : "Set `PUBLIC_URL` so the script is filled in.",
        ].join("\n"),
        files: [file],
      });
    },
  },
];

async function handleButton(interaction) {
  if (interaction.customId === "verify_confirm") {
    await interaction.deferReply({ ephemeral: true });
    const pending = db.getPending(interaction.user.id);
    if (!pending) throw new Error("No verification is waiting. Run `/verify` again.");
    const profile = await roblox.getUser(pending.robloxId);
    if (!String(profile.description || "").includes(pending.code)) {
      throw new Error(`I could not find \`${pending.code}\` in ${pending.robloxName}'s About section.`);
    }
    await db.setLink(interaction.user.id, {
      robloxId: pending.robloxId,
      robloxName: pending.robloxName,
      verifiedAt: new Date().toISOString(),
    });
    await interaction.editReply(`Verified as **${pending.robloxName}**. \`/myinfo\` will use this account.`);
    return;
  }

  if (interaction.customId === "activity_reset_confirm") {
    assertStaff(interaction);
    await db.resetActivity();
    await interaction.update({ content: "Activity was reset for everyone.", components: [] });
  }
}

module.exports = { commands, handleButton };

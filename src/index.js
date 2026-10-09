const { Client, GatewayIntentBits, REST, Routes } = require("discord.js");
const config = require("./config");
const roblox = require("./roblox");
const { createApi } = require("./http");
const { commands, handleButton } = require("./commands");
const { commands: moderationCommands } = require("./moderation");

const allCommands = [...commands, ...moderationCommands];
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const byName = new Map(allCommands.map((command) => [command.data.name, command]));

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  const rest = new REST({ version: "10" }).setToken(config.discordToken);
  const body = allCommands.map((command) => command.data.toJSON());
  if (config.guildId) {
    await rest.put(Routes.applicationGuildCommands(client.user.id, config.guildId), { body });
    console.log(`Registered ${body.length} guild commands in ${config.guildId}`);
  } else {
    await rest.put(Routes.applicationCommands(client.user.id), { body });
    console.log(`Registered ${body.length} global commands`);
  }
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = byName.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
      return;
    }
    if (interaction.isButton()) await handleButton(interaction);
  } catch (error) {
    console.error(error);
    const payload = { content: error.message || "Something went wrong." };
    if (interaction.deferred || interaction.replied) await interaction.editReply(payload).catch(() => {});
    else await interaction.reply({ ...payload, ephemeral: true }).catch(() => {});
  }
});

createApi().listen(config.port, () => {
  console.log(`HTTP listening on ${config.port}`);
  console.log(`Group ${config.groupId}`);
  if (!config.robloxCookie) console.warn("ROBLOX_COOKIE is missing. Rank commands will fail.");
  else {
    roblox.authenticatedUser()
      .then((user) => console.log(`Roblox cookie logged in as ${user.name} (${user.id})`))
      .catch((error) => console.warn(`Roblox cookie check failed: ${error.message}`));
  }
  if (!config.apiSecret) console.warn("API_SECRET is missing. Studio scripts cannot post.");
  if (!config.publicUrl) console.warn("PUBLIC_URL is missing. Generate a Railway domain and set it.");
});

client.login(config.discordToken);

import {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
  Events,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
} from "discord.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const RECIPIENTS_FILE = path.join(DATA_DIR, "dm-recipients.json");
const ADMINS_FILE = path.join(DATA_DIR, "admins.json");
const SKIP_FILE = path.join(DATA_DIR, "skip-list.json");
const LOG_FILE = path.join(DATA_DIR, "message-log.json");
const AGREEMENTS_FILE = path.join(DATA_DIR, "agreements.json");

const AGREEMENT_TEXT =
 function createAgreementText(price, dueDate) {
  return (
    `**PAYMENT AGREEMENT**\n\n` +
    `By signing this agreement, the undersigned party acknowledges and agrees to the following terms:\n\n` +
    `1. An initial payment of **${price}** is due upon signing this agreement.\n` +
    `2. The remaining balance shall be paid in full no later than **${dueDate}**.\n` +
    `3. Failure to complete the remaining payment by the due date may result in further action.\n\n` +
    `This agreement is entered into voluntarily and constitutes a binding commitment between the parties.`
  );
}

function loadAgreements() {
  try {
    ensureDataDir();
    if (!fs.existsSync(AGREEMENTS_FILE)) return [];
    return JSON.parse(fs.readFileSync(AGREEMENTS_FILE, "utf-8"));
  } catch { return []; }
}

function saveAgreement(entry) {
  ensureDataDir();
  const list = loadAgreements();
  list.push(entry);
  fs.writeFileSync(AGREEMENTS_FILE, JSON.stringify(list, null, 2), "utf-8");
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadSet(file) {
  try {
    ensureDataDir();
    if (!fs.existsSync(file)) return new Set();
    return new Set(JSON.parse(fs.readFileSync(file, "utf-8")));
  } catch { return new Set(); }
}

function saveSet(file, set) {
  ensureDataDir();
  fs.writeFileSync(file, JSON.stringify([...set]), "utf-8");
}

function loadLog() {
  try {
    ensureDataDir();
    if (!fs.existsSync(LOG_FILE)) return [];
    return JSON.parse(fs.readFileSync(LOG_FILE, "utf-8"));
  } catch { return []; }
}

function appendLog(entry) {
  ensureDataDir();
  const log = loadLog();
  log.push(entry);
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2), "utf-8");
}

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) { console.error("DISCORD_BOT_TOKEN is not set."); process.exit(1); }

const BOT_OWNER_ID = process.env.BOT_OWNER_ID ?? "";
const recipients = loadSet(RECIPIENTS_FILE);
const admins = loadSet(ADMINS_FILE);
const skipList = loadSet(SKIP_FILE);

const isOwner = (id) => BOT_OWNER_ID !== "" && id === BOT_OWNER_ID;
const isAdmin = (id) => isOwner(id) || admins.has(id);
const isRecipient = (id) => recipients.has(id);
const isSkipped = (id) => skipList.has(id);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message],
});

const commands = [
  new SlashCommandBuilder().setName("panel").setDescription("Open the bot control panel.").toJSON(),
  new SlashCommandBuilder().setName("myperms").setDescription("Check what level of access you have in this bot.").toJSON(),
  new SlashCommandBuilder()
    .setName("reply")
    .setDescription("Reply to someone who DM'd the bot (recipients only).")
    .addStringOption((o) => o.setName("user_id").setDescription("The Discord User ID of the person to reply to.").setRequired(true))
    .addStringOption((o) => o.setName("message").setDescription("The message to send.").setRequired(true).setMaxLength(1900))
    .toJSON(),
  new SlashCommandBuilder()
   new SlashCommandBuilder()
 const commands = [
  new SlashCommandBuilder().setName("panel").setDescription("Open the bot control panel.").toJSON(),
  new SlashCommandBuilder().setName("myperms").setDescription("Check what level of access you have in this bot.").toJSON(),
  new SlashCommandBuilder()
    .setName("reply")
    .setDescription("Reply to someone who DM'd the bot (recipients only).")
    .addStringOption((o) => o.setName("user_id").setDescription("The Discord User ID of the person to reply to.").setRequired(true))
    .addStringOption((o) => o.setName("message").setDescription("The message to send.").setRequired(true).setMaxLength(1900))
    .toJSON(),
  new SlashCommandBuilder()
   new SlashCommandBuilder()
  .setName("agree")
  .setDescription("Create a custom payment agreement.")
  .addStringOption((o) =>
    o
      .setName("price")
      .setDescription("Payment amount")
      .setRequired(true)
  )
  .addStringOption((o) =>
    o
      .setName("date")
      .setDescription("Due date")
      .setRequired(true)
  )
  .setIntegrationTypes([0, 1])
  .setContexts([0, 1, 2])
  .toJSON(),
];

client.once(Events.ClientReady, async (readyClient) => {
  const clientId = readyClient.user.id;
  console.log(`Logged in as ${readyClient.user.tag} (ID: ${clientId})`);
  console.log(`\nAdd to Server: https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=67584&scope=bot%20applications.commands`);
  console.log(`Add to Apps:   https://discord.com/api/oauth2/authorize?client_id=${clientId}&integration_type=1&scope=applications.commands\n`);

  const rest = new REST({ version: "10" }).setToken(token);
  try {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log("Slash commands registered.");
  } catch (err) { console.error("Failed to register slash commands:", err); }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "panel") await handlePanel(interaction);

    if (interaction.commandName === "myperms") {
      const userId = interaction.user.id;
      let level, description;
      if (isOwner(userId)) { level = "👑 Bot Owner"; description = "You have full control — manage admins, recipients, skip list, broadcast, and view logs."; }
      else if (isAdmin(userId)) { level = "🛡️ Admin"; description = "You can manage recipients and the skip list, broadcast messages, and view the DM log."; }
      else if (isRecipient(userId)) { level = "📬 Recipient"; description = "You receive forwarded DMs and can reply using `/reply`."; }
      else { level = "🌐 Public"; description = "You can DM the bot and your message will be forwarded. You cannot reply or manage the bot."; }
      await interaction.reply({ content: `**Your permission level:** ${level}\n${description}`, ephemeral: true });
    }

    if (interaction.commandName === "reply") {
      const userId = interaction.user.id;
      if (!isRecipient(userId)) { await interaction.reply({ content: "Only added recipients can use `/reply`.", ephemeral: true }); return; }
      const targetId = interaction.options.getString("user_id", true).trim();
      const replyContent = interaction.options.getString("message", true).trim();
      try {
        const targetUser = await client.users.fetch(targetId);
        await targetUser.send(`**Reply from (${interaction.user.tag} | ID: ${userId})**\nMessage: ${replyContent}`);
        await interaction.reply({ content: `Your reply was sent to **${targetUser.tag}**.`, ephemeral: true });
      } catch {
        await interaction.reply({ content: `Could not send to \`${targetId}\`. They may have DMs disabled or the ID is invalid.`, ephemeral: true });
      }
    }

    if (interaction.commandName === "agree") {
  const price = interaction.options.getString("price");
  const dueDate = interaction.options.getString("date");

  const embed = new EmbedBuilder()
    .setTitle("Payment Agreement")
    .setColor(0xfee75c)
    .setDescription(createAgreementText(price, dueDate))
    .setFooter({ text: "Click the button below to sign this agreement." })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("p_sign_agreement")
      .setLabel("Sign Agreement")
      .setStyle(ButtonStyle.Success)
      .setEmoji("✍️")
  );

  await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: false,
  });
}
  }
  if (interaction.isButton()) { await handleButton(interaction); return; }
  if (interaction.isModalSubmit()) { await handleModal(interaction); }
});

async function handlePanel(interaction) {
  const userId = interaction.user.id;
  if (!isAdmin(userId)) { await interaction.reply({ content: "You don't have permission to use the panel.", ephemeral: true }); return; }

  const embed = new EmbedBuilder()
    .setTitle("Bot Control Panel").setColor(0x5865f2)
    .setDescription(isOwner(userId) ? "**Owner Panel** — manage admins, recipients, and skip list." : "**Admin Panel** — manage recipients and skip list.")
    .addFields(
      { name: "Recipients", value: `${recipients.size}`, inline: true },
      { name: "Admins", value: `${admins.size}`, inline: true },
      { name: "Skipped", value: `${skipList.size}`, inline: true },
      { name: "DMs Logged", value: `${loadLog().length}`, inline: true },
    ).setTimestamp();

  const recipientRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("p_add_recipient").setLabel("Add Recipient").setStyle(ButtonStyle.Success).setEmoji("➕"),
    new ButtonBuilder().setCustomId("p_remove_recipient").setLabel("Remove Recipient").setStyle(ButtonStyle.Danger).setEmoji("➖"),
    new ButtonBuilder().setCustomId("p_list_recipients").setLabel("List Recipients").setStyle(ButtonStyle.Secondary).setEmoji("📋"),
  );
  const skipRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("p_add_skip").setLabel("Add to Skip List").setStyle(ButtonStyle.Danger).setEmoji("🚫"),
    new ButtonBuilder().setCustomId("p_remove_skip").setLabel("Remove from Skip List").setStyle(ButtonStyle.Success).setEmoji("✅"),
    new ButtonBuilder().setCustomId("p_list_skip").setLabel("View Skip List").setStyle(ButtonStyle.Secondary).setEmoji("🗒️"),
  );
  const ownerRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("p_add_admin").setLabel("Add Admin").setStyle(ButtonStyle.Success).setEmoji("🛡️"),
    new ButtonBuilder().setCustomId("p_remove_admin").setLabel("Remove Admin").setStyle(ButtonStyle.Danger).setEmoji("🗑️"),
    new ButtonBuilder().setCustomId("p_list_admins").setLabel("List Admins").setStyle(ButtonStyle.Secondary).setEmoji("👥"),
  );
  const utilRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("p_broadcast").setLabel("Broadcast").setStyle(ButtonStyle.Primary).setEmoji("📢"),
    new ButtonBuilder().setCustomId("p_view_log").setLabel("View Log").setStyle(ButtonStyle.Secondary).setEmoji("📜"),
  );

  const components = isOwner(userId) ? [recipientRow, skipRow, ownerRow, utilRow] : [recipientRow, skipRow, utilRow];
  await interaction.reply({ embeds: [embed], components, ephemeral: true });
}

async function handleButton(interaction) {
  const userId = interaction.user.id;

  if (interaction.customId === "p_sign_agreement") {
    const modal = new ModalBuilder().setCustomId("modal_agree").setTitle("Sign Payment Agreement");
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("legal_name").setLabel("Your Full Legal Name")
          .setStyle(TextInputStyle.Short).setPlaceholder("e.g. John Smith").setRequired(true).setMaxLength(100)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("confirmation").setLabel("Type  I AGREE  to confirm")
          .setStyle(TextInputStyle.Short).setPlaceholder("I AGREE").setRequired(true).setMaxLength(10)
      ),
    );
    await interaction.showModal(modal);
    return;
  }

  const ownerOnly = ["p_add_admin", "p_remove_admin", "p_list_admins"];
  if (ownerOnly.includes(interaction.customId)) {
    if (!isOwner(userId)) { await interaction.reply({ content: "Only the bot owner can manage admins.", ephemeral: true }); return; }
  } else if (!isAdmin(userId)) {
    await interaction.reply({ content: "You don't have permission to do that.", ephemeral: true }); return;
  }

  const modalMap = {
    p_add_recipient: ["modal_add_recipient", "Add Recipient"],
    p_remove_recipient: ["modal_remove_recipient", "Remove Recipient"],
    p_add_skip: ["modal_add_skip", "Add to Skip List"],
    p_remove_skip: ["modal_remove_skip", "Remove from Skip List"],
    p_add_admin: ["modal_add_admin", "Add Admin"],
    p_remove_admin: ["modal_remove_admin", "Remove Admin"],
  };

  if (modalMap[interaction.customId]) {
    const [customId, title] = modalMap[interaction.customId];
    const modal = new ModalBuilder().setCustomId(customId).setTitle(title);
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId("user_id").setLabel("Discord User ID").setStyle(TextInputStyle.Short).setPlaceholder("e.g. 123456789012345678").setRequired(true)
    ));
    await interaction.showModal(modal);
    return;
  }

  if (interaction.customId === "p_list_recipients") {
    await interaction.deferReply({ ephemeral: true });
    await interaction.editReply({ content: await buildUserList(recipients, "Recipients") });
  } else if (interaction.customId === "p_list_skip") {
    await interaction.deferReply({ ephemeral: true });
    await interaction.editReply({ content: await buildUserList(skipList, "Skip List") });
  } else if (interaction.customId === "p_list_admins") {
    await interaction.deferReply({ ephemeral: true });
    await interaction.editReply({ content: await buildUserList(admins, "Admins") });
  } else if (interaction.customId === "p_broadcast") {
    const modal = new ModalBuilder().setCustomId("modal_broadcast").setTitle("Broadcast Message");
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId("broadcast_message").setLabel("Message")
        .setStyle(TextInputStyle.Paragraph).setPlaceholder("Type your broadcast message here...").setMaxLength(1900).setRequired(true)
    ));
    await interaction.showModal(modal);
  } else if (interaction.customId === "p_view_log") {
    await interaction.deferReply({ ephemeral: true });
    const log = loadLog();
    if (log.length === 0) { await interaction.editReply({ content: "No DMs logged yet." }); return; }
    const recent = log.slice(-10).reverse();
    const lines = recent.map((e) => {
      const ts = new Date(e.timestamp).toLocaleString("en-US", { timeZone: "UTC" });
      return `**[${ts} UTC]** ${e.senderTag} (\`${e.senderId}\`)\n> ${e.content.slice(0, 200)}${e.content.length > 200 ? "…" : ""}`;
    });
    await interaction.editReply({ content: `**Last ${recent.length} DM(s) (newest first):**\n\n${lines.join("\n\n")}` });
  }
}

async function handleModal(interaction) {
  const userId = interaction.user.id;

  if (interaction.customId === "modal_agree") {
    const legalName = interaction.fields.getTextInputValue("legal_name").trim();
    const confirmation = interaction.fields.getTextInputValue("confirmation").trim().toUpperCase();
    if (confirmation !== "I AGREE") {
      await interaction.reply({ content: `You must type **I AGREE** exactly to sign. You typed: \`${interaction.fields.getTextInputValue("confirmation").trim()}\``, ephemeral: true });
      return;
    }
    const signedAt = new Date().toISOString();
    saveAgreement({ discordId: userId, discordTag: interaction.user.tag, legalName, signedAt });
    const ts = new Date(signedAt).toLocaleString("en-US", { timeZone: "UTC" });
    await interaction.reply({
      content:
        `✅ **Agreement Signed Successfully**\n\n` +
        `**Name:** ${legalName}\n` +
        `**Discord:** ${interaction.user.tag} (\`${userId}\`)\n` +
        `**Signed at:** ${ts} UTC\n\n` +
        `You have agreed to pay **$7.40** now and complete the remaining balance by **June 11, 2026**.`,
      ephemeral: true,
    });
    if (BOT_OWNER_ID) {
      try {
        const owner = await client.users.fetch(BOT_OWNER_ID);
        await owner.send(`📝 **New Agreement Signed**\n**Name:** ${legalName}\n**Discord:** ${interaction.user.tag} (\`${userId}\`)\n**Signed at:** ${ts} UTC`);
      } catch { /* owner DMs may be closed */ }
    }
    return;
  }

  const ownerOnly = ["modal_add_admin", "modal_remove_admin"];
  if (ownerOnly.includes(interaction.customId)) {
    if (!isOwner(userId)) { await interaction.reply({ content: "Only the bot owner can manage admins.", ephemeral: true }); return; }
  } else if (!isAdmin(userId)) {
    await interaction.reply({ content: "You don't have permission.", ephemeral: true }); return;
  }

  const id = interaction.customId !== "modal_broadcast" ? interaction.fields.getTextInputValue("user_id").trim() : null;

  switch (interaction.customId) {
    case "modal_add_recipient":
      if (recipients.has(id)) { await interaction.reply({ content: `\`${id}\` is already a recipient.`, ephemeral: true }); return; }
      try { const u = await client.users.fetch(id); recipients.add(id); saveSet(RECIPIENTS_FILE, recipients); await interaction.reply({ content: `**${u.tag}** added as a recipient.`, ephemeral: true }); }
      catch { await interaction.reply({ content: `Could not find user \`${id}\`.`, ephemeral: true }); }
      break;
    case "modal_remove_recipient":
      if (!recipients.has(id)) { await interaction.reply({ content: `\`${id}\` is not a recipient.`, ephemeral: true }); return; }
      recipients.delete(id); saveSet(RECIPIENTS_FILE, recipients);
      await interaction.reply({ content: `User \`${id}\` removed from recipients.`, ephemeral: true });
      break;
    case "modal_add_skip":
      if (skipList.has(id)) { await interaction.reply({ content: `\`${id}\` is already on the skip list.`, ephemeral: true }); return; }
      try { const u = await client.users.fetch(id); skipList.add(id); saveSet(SKIP_FILE, skipList); await interaction.reply({ content: `**${u.tag}** added to skip list. Their DMs will be ignored.`, ephemeral: true }); }
      catch { skipList.add(id); saveSet(SKIP_FILE, skipList); await interaction.reply({ content: `\`${id}\` added to skip list.`, ephemeral: true }); }
      break;
    case "modal_remove_skip":
      if (!skipList.has(id)) { await interaction.reply({ content: `\`${id}\` is not on the skip list.`, ephemeral: true }); return; }
      skipList.delete(id); saveSet(SKIP_FILE, skipList);
      await interaction.reply({ content: `User \`${id}\` removed from skip list.`, ephemeral: true });
      break;
    case "modal_add_admin":
      if (admins.has(id)) { await interaction.reply({ content: `\`${id}\` is already an admin.`, ephemeral: true }); return; }
      try { const u = await client.users.fetch(id); admins.add(id); saveSet(ADMINS_FILE, admins); await interaction.reply({ content: `**${u.tag}** added as an admin.`, ephemeral: true }); }
      catch { await interaction.reply({ content: `Could not find user \`${id}\`.`, ephemeral: true }); }
      break;
    case "modal_remove_admin":
      if (!admins.has(id)) { await interaction.reply({ content: `\`${id}\` is not an admin.`, ephemeral: true }); return; }
      admins.delete(id); saveSet(ADMINS_FILE, admins);
      await interaction.reply({ content: `User \`${id}\` removed from admins.`, ephemeral: true });
      break;
    case "modal_broadcast": {
      const msg = interaction.fields.getTextInputValue("broadcast_message").trim();
      if (recipients.size === 0) { await interaction.reply({ content: "No recipients to broadcast to.", ephemeral: true }); return; }
      await interaction.deferReply({ ephemeral: true });
      const text = `**📢 Broadcast from (${interaction.user.tag} | ID: ${userId})**\n${msg}`;
      let ok = 0, fail = 0;
      for (const rid of recipients) {
        try { const u = await client.users.fetch(rid); await u.send(text); ok++; } catch { fail++; }
      }
      await interaction.editReply({ content: `Broadcast sent to **${ok}** recipient(s).${fail > 0 ? ` (${fail} unreachable)` : ""}` });
      break;
    }
  }
}

async function buildUserList(set, label) {
  if (set.size === 0) return `No ${label.toLowerCase()} added yet.`;
  const lines = [];
  for (const id of set) {
    try { const u = await client.users.fetch(id); lines.push(`• **${u.tag}** — \`${id}\``); }
    catch { lines.push(`• Unknown user — \`${id}\``); }
  }
  return `**${label} (${set.size}):**\n${lines.join("\n")}`;
}

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (message.channel.type === ChannelType.DM) await handleIncomingDM(message);
});

async function handleIncomingDM(message) {
  const { id: senderId, tag: senderTag } = message.author;
  const content = message.content;

  if (isSkipped(senderId)) {
    console.log(`Ignored DM from skipped user ${senderTag} (${senderId})`);
    return;
  }

  appendLog({ senderId, senderTag, content, timestamp: new Date().toISOString() });

  if (recipients.size === 0) {
    await message.author.send("No one is set up to receive messages yet. Please contact the bot admin.");
    return;
  }

  const forwardText =
    `**Received DM from (${senderTag} | ID: ${senderId})**\n` +
    `Message: ${content}\n\n` +
    `To reply, use: \`/reply\` and enter ID: \`${senderId}\``;

  let ok = 0, fail = 0;
  for (const recipientId of recipients) {
    try { const u = await client.users.fetch(recipientId); await u.send(forwardText); ok++; }
    catch { fail++; console.warn(`Could not DM recipient ${recipientId}`); }
  }

  await message.author.send(
    ok > 0
      ? `Your message was forwarded to ${ok} recipient(s).${fail > 0 ? ` (${fail} unreachable)` : ""}`
      : "Your message could not be delivered — recipients may have DMs disabled."
  );
}

client.login();

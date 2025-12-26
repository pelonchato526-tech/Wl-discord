import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events
} from "discord.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const {
  CLIENT_ID,
  CLIENT_SECRET,
  DISCORD_TOKEN,
  GUILD_ID,
  WL_CHANNEL_ID,
  RESULT_CHANNEL_ID,
  ROLE_ACCEPTED,
  ROLE_REJECTED,
  PORT = 3000
} = process.env;

/* ================= DISCORD ================= */
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});
client.login(DISCORD_TOKEN);
client.once("ready", () => console.log("🤖 Bot listo"));

/* ================= WL STATE ================= */
const wlState = new Map();

/* ================= OAUTH ================= */
app.get("/callback", async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.send("No autorizado");

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: "https://wl-discord.onrender.com/callback"
    });

    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params
    });
    const token = await tokenRes.json();

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${token.access_token}` }
    });
    const user = await userRes.json();

    if (!wlState.has(user.id)) {
      wlState.set(user.id, { status: "none", attempts: 0 });
    }

    res.redirect(`/form.html?uid=${user.id}&name=${user.username}`);
  } catch {
    res.send("Error OAuth");
  }
});

/* ================= SUBMIT WL ================= */
app.post("/submit", async (req, res) => {
  const { discordId, answers } = req.body;
  const state = wlState.get(discordId);

  if (!state) return res.json({ error: "No autorizado" });
  if (state.status !== "filling") return res.json({ error: "WL inválida" });
  if (answers.length !== 12) return res.json({ error: "WL incompleta" });

  state.status = "sent";

  const embed = new EmbedBuilder()
    .setTitle("📄 Whitelist")
    .setColor("#f1c40f")
    .setDescription(
      answers.map((a, i) => `**${i + 1}.** ${a}`).join("\n\n")
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`accept_${discordId}`)
      .setLabel("Aceptar")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`reject_${discordId}`)
      .setLabel("Rechazar")
      .setStyle(ButtonStyle.Danger)
  );

  const channel = await client.channels.fetch(WL_CHANNEL_ID);
  await channel.send({
    content: `<@${discordId}>`,
    embeds: [embed],
    components: [row]
  });

  res.json({ ok: true });
});

/* ================= BOTONES ================= */
client.on(Events.InteractionCreate, async (i) => {
  if (!i.isButton()) return;
  const [action, id] = i.customId.split("_");

  const state = wlState.get(id);
  if (!state) return;

  const guild = await client.guilds.fetch(GUILD_ID);
  const member = await guild.members.fetch(id).catch(() => null);
  if (!member) return;

  if (action === "accept") {
    state.status = "accepted";
    await member.roles.add(ROLE_ACCEPTED);
    await i.update({ components: [] });
    await client.channels.fetch(RESULT_CHANNEL_ID)
      .then(c => c.send(`✅ <@${id}> **ACEPTADO**`));
  }

  if (action === "reject") {
    state.status = "rejected";
    await member.roles.add(ROLE_REJECTED);

    const retry = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`retry_${id}`)
        .setLabel("🎟 Otra oportunidad")
        .setStyle(ButtonStyle.Secondary)
    );

    await i.update({ components: [retry] });
    await client.channels.fetch(RESULT_CHANNEL_ID)
      .then(c => c.send(`❌ <@${id}> **RECHAZADO**`));
  }

  if (action === "retry") {
    if (state.attempts >= 3) {
      return i.reply({ content: "❌ Sin intentos", ephemeral: true });
    }
    state.status = "none";
    await i.update({ components: [] });
    await member.send("🎟 Tenés otra oportunidad para la WL.");
  }
});

/* ================= START ================= */
app.listen(PORT, () => console.log("🌐 Web lista"));

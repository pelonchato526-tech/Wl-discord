const express = require("express");
const path = require("path");
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");

const app = express();
app.use(express.json());
app.use(express.static("public"));

/* =========================
   DISCORD BOT
========================= */

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages]
});

client.once("ready", () => {
  console.log("🤖 Bot conectado");
});

client.login(process.env.BOT_TOKEN);

/* =========================
   OAUTH CALLBACK
========================= */

app.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("❌ Error OAuth");

  res.redirect("/form.html");
});

/* =========================
   ENVIAR WL A DISCORD
========================= */

app.post("/send-wl", async (req, res) => {
  try {
    const { discordId, respuestas } = req.body;

    const channel = await client.channels.fetch(process.env.RESULT_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setTitle("📄 Nueva WL enviada")
      .setColor(0xffd000)
      .setDescription(
        respuestas.map((r, i) => `**${i + 1}.** ${r}`).join("\n")
      )
      .setFooter({ text: "Estado: Pendiente" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`accept:${discordId}`)
        .setLabel("✅ Aceptar")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`reject:${discordId}`)
        .setLabel("❌ Rechazar")
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: `<@${discordId}> envió su WL:`,
      embeds: [embed],
      components: [row]
    });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
});

/* =========================
   BOTONES
========================= */

client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  const [action, userId] = interaction.customId.split(":");

  const gifAccept =
    "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMGowbHhkaXJyeXcwanFjenNnbTV4ZTZhaGViMjN1cXIyODk2emcwNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/RGxQHSsRUP753rvYHs/giphy.gif";

  const gifReject =
    "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNGxiZzhnaXU1czFqMWVjNjNxNzVnMnB0N2VpdTdmNndlbHh6d2U1eiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/2iD1cNf6tslgWDLn6n/giphy.gif";

  if (action === "accept") {
    const embed = EmbedBuilder.from(interaction.message.embeds[0])
      .setTitle("✅ WL ACEPTADA")
      .setColor(0x00ff00)
      .setImage(gifAccept);

    await interaction.update({ embeds: [embed], components: [] });

    const user = await client.users.fetch(userId);
    user.send({ embeds: [embed] });
  }

  if (action === "reject") {
    const embed = EmbedBuilder.from(interaction.message.embeds[0])
      .setTitle("❌ WL RECHAZADA")
      .setColor(0xff0000)
      .setImage(gifReject);

    const retry = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`retry:${userId}`)
        .setLabel("🔁 Dar otra oportunidad")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({ embeds: [embed], components: [retry] });
  }

  if (action === "retry") {
    await interaction.reply({
      content: "🔁 Se te dio otra oportunidad para hacer la WL.",
      ephemeral: true
    });

    const user = await client.users.fetch(userId);
    user.send("🔁 Tenés otra oportunidad para hacer la whitelist en la web.");
  }
});

/* =========================
   SERVER
========================= */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🌐 Web corriendo en puerto", PORT);
});

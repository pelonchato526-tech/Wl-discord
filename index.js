const express = require("express");
const fetch = require("node-fetch");
const { Client, GatewayIntentBits } = require("discord.js");

const app = express();
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const {
  DISCORD_TOKEN,
  CLIENT_ID,
  GUILD_ID,
  WL_CHANNEL_ID,
  RESULT_CHANNEL_ID
} = process.env;

// ----------------- DISCORD BOT -----------------
client.login(DISCORD_TOKEN);

client.once("ready", () => {
  console.log(`🤖 Bot WL activo como ${client.user.tag}`);
});

// ----------------- WEB SERVER -----------------
app.get("/", (req, res) => {
  res.send(`
    <h1>Whitelist RP</h1>
    <a href="/login">Iniciar WL con Discord</a>
  `);
});

// ----------------- LOGIN DISCORD -----------------
app.get("/login", (req, res) => {
  const redirect = 
    "https://discord.com/oauth2/authorize?client_id=1453271207490355284&response_type=code&redirect_uri=https%3A%2F%2Fdiscord.com%2Fapi%2Foauth2%2Fauthorize&scope=identify+guilds" +
    `?client_id=${CLIENT_ID}` +
    "&response_type=code" +
    "&scope=identify" +
    "&redirect_uri=" +
    encodeURIComponent("https://wl-discord.onrender.com");

  res.redirect(redirect);
});

// ----------------- CALLBACK -----------------
app.get("/callback", async (req, res) => {
  res.send(`
    <h2>Login correcto</h2>
    <p>Leé las reglas y comenzá tu WL.</p>
    <a href="/start">Comenzar WL (20 minutos)</a>
  `);
});

// ----------------- START WL -----------------
app.get("/start", (req, res) => {
  res.send(`
    <h2>Formulario WL</h2>
    <p>⏱️ Tenés 20 minutos</p>
    <form method="POST" action="/submit">
      <input name="nombre" placeholder="Nombre IC" required /><br><br>
      <textarea name="rp" placeholder="Situación RP" required></textarea><br><br>
      <button type="submit">Enviar WL</button>
    </form>
  `);
});

// ----------------- SUBMIT WL -----------------
app.post("/submit", express.urlencoded({ extended: true }), async (req, res) => {
  const channel = await client.channels.fetch(WL_CHANNEL_ID);

  await channel.send({
    content: "📄 **Nueva WL enviada**"
  });

  res.send("✅ WL enviada. Esperá resultado en Discord.");
});

// ----------------- SERVER -----------------
app.listen(3000, () => {
  console.log("🌐 Web WL activa en puerto 3000");
});

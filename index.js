require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const GUILD_ID = process.env.GUILD_ID;
const WL_CHANNEL_ID = process.env.WL_CHANNEL_ID;
const RESULT_CHANNEL_ID = process.env.RESULT_CHANNEL_ID;
const PORT = process.env.PORT || 3000;

// Roles
const ROLE_ACCEPTED = '1453469378178846740';
const ROLE_REJECTED = '1453469439306760276';

// OAuth2
const CLIENT_ID = '1453271207490355284';
const REDIRECT_URI = 'https://wl-discord.onrender.com/callback';
const OAUTH_URL = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds%20email%20openid`;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Preguntas WL
const preguntas = [
  "¿Qué es el MetaGaming (MG)?",
  "Si mueres y reapareces en el hospital (PK), ¿qué debes hacer?",
  "¿Qué es el PowerGaming (PG)?",
  "Te están atracando con un arma en la cabeza. ¿Cómo actúas?",
  "¿Qué significa OOC (Out Of Character)?",
  "¿Qué es el VDM (Vehicle Deathmatch)?",
  "¿Cuál es el procedimiento si ves a alguien incumpliendo las normas?",
  "¿Qué es el Combat Logging?",
  "¿Qué es el Bunny Jump?",
  "¿Está permitido hablar de temas de la vida real por el chat de voz?",
  "¿Qué es el RDM (Random Deathmatch)?",
  "¿Qué significa Valorar la vida?"
];

// --- Inicio ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Callback OAuth2 ---
app.get('https://discord.com/oauth2/authorize?client_id=1453271207490355284&response_type=code&redirect_uri=https%3A%2F%2Fwl-discord.onrender.com%2Fcallback&scope=identify+guilds+email+openid', async (req, res) => {
  try {
    const code = req.query.code;
    if(!code) return res.redirect('/');

    const params = new URLSearchParams();
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', REDIRECT_URI);

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type':'application/x-www-form-urlencoded' },
      body: params
    });

    const token = await tokenRes.json();
    if(token.error) return res.redirect('/');

    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${token.access_token}` }
    });

    const user = await userRes.json();
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } catch(e) {
    console.error(e);
    res.redirect('/');
  }
});

// --- Enviar WL ---
app.post('/wl-form', async (req,res)=>{
  const { respuestas, discordId } = req.body;

  try {
    const wlCh = await client.channels.fetch(WL_CHANNEL_ID);
    const resultCh = await client.channels.fetch(RESULT_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setTitle('📄 Nueva Whitelist')
      .setDescription(respuestas.map((r,i)=>`**${i+1}.** ${r}`).join('\n\n'))
      .setColor('#FFD700');

    // Mensaje en canales
    await wlCh.send({ content:`<@${discordId}> envió su WL`, embeds:[embed] });
    await resultCh.send({ content:`<@${discordId}> envió su WL`, embeds:[embed] });

    res.json({ ok:true });
  } catch(e){
    console.error(e);
    res.json({ ok:false, mensaje:'Error enviando WL'});
  }
});

// --- Botones aceptar/rechazar ---
client.on(Events.InteractionCreate, async i=>{
  if(!i.isButton()) return;

  const [accion, id] = i.customId.split('_');
  const g = await client.guilds.fetch(GUILD_ID);
  const m = await g.members.fetch(id);

  const resultCh = await client.channels.fetch(RESULT_CHANNEL_ID);

  let gif;
  if(accion==='accept'){
    await m.roles.add(ROLE_ACCEPTED);
    gif = 'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExZnh3N3duYXA4OW0wMG1samVyZTUxdzk1ZWF2MGh6dHhrYWJ5MzBsMSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/sOzVzt9IWu2ECjLVfF/giphy.gif';
    await m.send({ content:'✅ Tu WL ha sido ACEPTADA', files:[gif] });
  } else {
    await m.roles.add(ROLE_REJECTED);
    gif = 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2VveW9waW94OGFicmcyeGZzZDZ1cG4zb3Y5eXh2OTFyMTE3OGZuNiZlcD12MV9pbnRlcm5hbF9naWQmY3Q9Zw/bGtF6Y5QRjmvjqamoL/giphy.gif';
    await m.send({ content:'❌ Tu WL ha sido RECHAZADA', files:[gif] });
  }

  const embed = new EmbedBuilder()
    .setTitle(accion==='accept'?'✅ WL Aceptada':'❌ WL Rechazada')
    .setDescription(`<@${id}>`)
    .setImage(gif)
    .setColor('#FFD700');

  await resultCh.send({ embeds:[embed] });
  await i.update({ components:[] });
});

// --- Login Bot y servidor ---
client.login(TOKEN);
app.listen(PORT, ()=>console.log(`Servidor listo en puerto ${PORT}`));

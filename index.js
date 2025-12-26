const express = require('express');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const GUILD_ID = process.env.GUILD_ID;
const WL_CHANNEL_ID = process.env.WL_CHANNEL_ID;
const RESULT_CHANNEL_ID = process.env.RESULT_CHANNEL_ID;
const PORT = process.env.PORT || 3000;

const ROLE_ACCEPTED = '1453469378178846740';
const ROLE_REJECTED = '1453469439306760276';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages] });
client.login(TOKEN);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

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
  "¿Qué significa valorar la vida?"
];

// --- Página de inicio ---
app.get('/', (req,res)=>{
  const oauthLink = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=https%3A%2F%2Fwl-discord.onrender.com%2Fcallback&scope=identify+guilds+email+openid`;
  res.send(`
    <html>
    <head>
      <title>WL Piña RP</title>
      <link rel="stylesheet" href="/style.css">
    </head>
    <body>
      <div class="card inicio">
        <img id="logo" src="/logo.png" alt="Piña RP"/>
        <h1>La Piña RP</h1>
        <p>Lee las instrucciones antes de comenzar tu WL.</p>
        <p>Recuerda: Solo puedes enviar tu WL una vez.</p>
        <a href="${oauthLink}"><button class="btn">Conectar con Discord y Comenzar</button></a>
      </div>
    </body>
    </html>
  `);
});

// --- Callback OAuth2 ---
app.get('/callback', async (req,res)=>{
  try {
    const code = req.query.code;
    if(!code) return res.send("❌ No se recibió código OAuth2");

    const params = new URLSearchParams();
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('grant_type','authorization_code');
    params.append('code', code);
    params.append('redirect_uri','https://wl-discord.onrender.com/callback');

    const tokenRes = await fetch('https://discord.com/api/oauth2/token',{
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body: params
    });

    const tokenData = await tokenRes.json();
    if(tokenData.error) return res.send(`❌ OAuth2 Error: ${tokenData.error_description}`);

    const userRes = await fetch('https://discord.com/api/users/@me',{
      headers:{Authorization:`Bearer ${tokenData.access_token}`}
    });

    const userData = await userRes.json();
    const discordId = userData.id;
    const username = userData.username;

    // Redirige a instrucciones.html con query params
    res.redirect(`/instrucciones.html?discordId=${discordId}&username=${encodeURIComponent(username)}`);
  } catch(err){
    console.error(err);
    res.send('❌ Error interno');
  }
});

// --- WL submit ---
app.post('/wl-form', async (req,res)=>{
  const { discordId, respuestas } = req.body;
  if(!discordId || !respuestas) return res.status(400).json({ error:'Faltan datos' });

  try{
    const wlChannel = await client.channels.fetch(WL_CHANNEL_ID);
    await wlChannel.send(`<@${discordId}> envió su WL:`);

    const embed = new EmbedBuilder()
      .setTitle('📄 Nueva WL enviada')
      .setDescription(respuestas.map((r,i)=>`\n**Pregunta ${i+1}:** ${r}`).join(''))
      .setColor('#FFD700');

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId(`accept_${discordId}`).setLabel('✅ Aceptar').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`reject_${discordId}`).setLabel('❌ Rechazar').setStyle(ButtonStyle.Danger)
      );

    await wlChannel.send({ embeds:[embed], components:[row] });

    res.json({ status:'ok' });
  } catch(err){
    console.error(err);
    res.status(500).json({ error:'Error enviando a Discord' });
  }
});

// --- Bot botones ---
client.on(Events.InteractionCreate, async interaction=>{
  if(!interaction.isButton()) return;
  const [action, discordId] = interaction.customId.split('_');
  const guild = await client.guilds.fetch(GUILD_ID);
  const member = await guild.members.fetch(discordId).catch(()=>null);
  if(!member) return;

  const resultChannel = await client.channels.fetch(RESULT_CHANNEL_ID);

  if(action==='accept') await member.roles.add(ROLE_ACCEPTED).catch(()=>null);
  else if(action==='reject') await member.roles.add(ROLE_REJECTED).catch(()=>null);

  const embed = new EmbedBuilder()
    .setTitle(action==='accept'?'✅ WL Aceptada':'❌ WL Rechazada')
    .setDescription(`<@${discordId}> ${action==='accept'?'fue aceptado':'fue rechazado'}`)
    .setColor(action==='accept'?'#00FF00':'#FF0000')
    .setImage(action==='accept'?'https://media3.giphy.com/media/sOzVzt9IWu2ECjLVfF/giphy.gif':'https://media2.giphy.com/media/bGtF6Y5QRjmvjqamoL/giphy.gif');

  member.send({ embeds:[embed] }).catch(()=>null);
  await resultChannel.send({ embeds:[embed] });
  await interaction.update({ content: action==='accept'?'✅ WL aceptada':'❌ WL rechazada', components:[], embeds:interaction.message.embeds });
});

app.listen(PORT, ()=>console.log(`Servidor corriendo en puerto ${PORT}`));

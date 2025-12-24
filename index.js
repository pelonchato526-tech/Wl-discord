const express = require('express');
const fetch = require('node-fetch');
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events
} = require('discord.js');

// ===== VARIABLES =====
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const GUILD_ID = process.env.GUILD_ID;
const WL_CHANNEL_ID = process.env.WL_CHANNEL_ID;
const RESULT_CHANNEL_ID = process.env.RESULT_CHANNEL_ID;
const PORT = process.env.PORT || 3000;

// Roles
const ROLE_ACCEPTED = '1453469378178846740';
const ROLE_REJECTED = '1453469439306760276';

// ===== BOT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// ===== WEB =====
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// ===== PREGUNTAS =====
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
  "¿Está permitido hablar de temas de la vida real por voz IC?",
  "¿Qué es el RDM (Random Deathmatch)?",
  "¿Qué significa valorar la vida?"
];

// ===== HOME =====
app.get('/', (req, res) => {
  const oauth = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=https%3A%2F%2Fwl-discord.onrender.com%2Fcallback&scope=identify+guilds`;
  res.send(`
  <html>
  <head>
    <title>WL Piña RP</title>
    <style>
      body{background:#000;color:#fff;font-family:Arial;text-align:center}
      h1{color:#FFD700;font-size:48px}
      button{padding:15px 30px;font-size:24px;background:#FFD700;border:0;border-radius:8px}
      img{width:200px;margin:30px}
    </style>
  </head>
  <body>
    <img src="/logo.png">
    <h1>Piña RP</h1>
    <p>Lee las normas antes de comenzar tu WL</p>
    <a href="${oauth}"><button>Conectar con Discord</button></a>
  </body>
  </html>
  `);
});

// ===== CALLBACK =====
app.get('/callback', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.send('OAuth inválido');

    const params = new URLSearchParams();
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', 'https://wl-discord.onrender.com/callback');

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const token = await tokenRes.json();

    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${token.access_token}` }
    });

    const user = await userRes.json();

    res.send(`
    <html>
    <body style="background:#000;color:#fff;text-align:center">
    <h2>WL de ${user.username}</h2>
    <div id="box"></div>
    <script>
      const preguntas = ${JSON.stringify(preguntas)};
      let i = 0;
      const r = [];
      const box = document.getElementById('box');

      function show(){
        box.innerHTML = '<p>'+preguntas[i]+'</p><input id="a"><br><button onclick="next()">Listo</button>';
      }

      window.next = () => {
        const v = document.getElementById('a').value;
        if(!v) return alert('Responde');
        r.push(v);
        i++;
        if(i<preguntas.length) show();
        else send();
      }

      async function send(){
        box.innerHTML='Enviando...';
        await fetch('/wl-form',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({ discordId:'${user.id}', respuestas:r })
        });
        box.innerHTML='✅ WL enviada';
      }
      show();
    </script>
    </body>
    </html>
    `);
  } catch (e) {
    console.error(e);
    res.send('Error OAuth');
  }
});

// ===== ENVIAR WL =====
app.post('/wl-form', async (req, res) => {
  const { discordId, respuestas } = req.body;
  const ch = await client.channels.fetch(WL_CHANNEL_ID);

  await ch.send(`<@${discordId}> envió su WL`);

  const embed = new EmbedBuilder()
    .setTitle('📄 Nueva WL')
    .setColor('#FFD700')
    .setDescription(respuestas.map((r,i)=>`**${i+1}.** ${r}`).join('\n'));

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`accept_${discordId}`).setLabel('Aceptar').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`reject_${discordId}`).setLabel('Rechazar').setStyle(ButtonStyle.Danger)
  );

  await ch.send({ embeds:[embed], components:[row] });
  res.json({ ok:true });
});

// ===== BOTONES =====
client.on(Events.InteractionCreate, async i => {
  if (!i.isButton()) return;

  const [a,id] = i.customId.split('_');
  const g = await client.guilds.fetch(GUILD_ID);
  const m = await g.members.fetch(id);

  const result = await client.channels.fetch(RESULT_CHANNEL_ID);

  if (a === 'accept') {
    await m.roles.add(ROLE_ACCEPTED);
    await m.send({ embeds:[ new EmbedBuilder().setTitle('WL Aceptada').setImage('https://media.giphy.com/media/26FPy3QZQqGtDcrja/giphy.gif').setColor('#00ff00') ]});
    await result.send(`✅ <@${id}> WL ACEPTADA`);
  }

  if (a === 'reject') {
    await m.roles.add(ROLE_REJECTED);
    await m.send({ embeds:[ new EmbedBuilder().setTitle('WL Rechazada').setImage('https://media.giphy.com/media/3o6Zt481isNVuQI1l6/giphy.gif').setColor('#ff0000') ]});
    await result.send(`❌ <@${id}> WL RECHAZADA`);
  }

  await i.update({ components:[] });
});

// ===== START =====
client.once('ready',()=>console.log('Bot listo'));
client.login(TOKEN);
app.listen(PORT,()=>console.log('Web lista'));

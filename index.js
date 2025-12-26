// index.js
const express = require('express');
const fetch = require('node-fetch'); // si Node >=18 podés usar fetch nativo
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

// --- Datos de WL ---
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

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // logo, css, etc.

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ]
});

// --- Anti doble WL ---
const sentUsers = new Set();

// --- Inicio ---
app.get('/', (req,res)=>{
  const oauthLink = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=https%3A%2F%2Fwl-discord.onrender.com%2Fcallback&scope=identify+guilds+email+openid`;
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>WL La Piña RP</title>
<link rel="stylesheet" href="/style.css">
</head>
<body>
<div class="card">
<img src="/logo.png" class="logo">
<h1>La Piña RP</h1>
<div class="subtitle">Sistema de Whitelist Oficial</div>
<div class="instructions">
  • Lee cuidadosamente cada pregunta.<br>
  • Solo puedes enviar tu WL una vez.<br>
  • Tienes 15 minutos para completar.<br>
  • No puedes volver atrás.
</div>
<a href="${oauthLink}"><button class="btn">Conectar con Discord y Comenzar</button></a>
<div class="footer">© 2025 La Piña RP</div>
</div>
</body>
</html>
  `);
});

// --- Callback OAuth2 ---
app.get('/callback', async (req,res)=>{
  try{
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
    if(tokenData.error) return res.send("❌ Error OAuth2: " + tokenData.error_description);

    const userRes = await fetch('https://discord.com/api/users/@me',{
      headers:{ Authorization: `Bearer ${tokenData.access_token}` }
    });
    const userData = await userRes.json();

    const discordId = userData.id;
    const username = userData.username;

    if(sentUsers.has(discordId)){
      return res.send("<h2>❌ Ya enviaste tu WL</h2>");
    }

    // --- Formulario paso a paso ---
    res.send(`
<!DOCTYPE html>
<html>
<head>
<title>WL La Piña RP</title>
<link rel="stylesheet" href="/style.css">
</head>
<body>
<div class="card">
<img src="/logo.png" class="logo">
<h1>WL Formulario - ${username}</h1>
<div id="progress-container"><div id="progress-bar"></div></div>
<div id="timer">Tiempo restante: 15:00</div>
<div id="form-container">
<p id="instructions">Presiona "Comenzar" para iniciar.</p>
<button id="startBtn" class="btn">Comenzar</button>
</div>
<div class="footer">© 2025 La Piña RP</div>
</div>

<script>
const preguntas = ${JSON.stringify(preguntas)};
let current=0;
const respuestas=[];
let tiempo = 900;
let timerEl = document.getElementById('timer');
let timerInterval;
const discordId = "${discordId}";

const startBtn = document.getElementById('startBtn');
const container = document.getElementById('form-container');
const progressBar = document.getElementById('progress-bar');

startBtn.onclick = ()=>{
  showQuestion();
  timerInterval = setInterval(()=>{
    tiempo--;
    let min = Math.floor(tiempo/60).toString().padStart(2,'0');
    let sec = (tiempo%60).toString().padStart(2,'0');
    timerEl.innerText = "Tiempo restante: "+min+":"+sec;
    if(tiempo<=0){
      clearInterval(timerInterval);
      container.innerHTML="<h2>⏰ Tiempo expirado</h2>";
    }
  },1000);
};

function showQuestion(){
  progressBar.style.width = ((current)/preguntas.length*100) + "%";
  container.innerHTML = \`
    <div id="question">\${preguntas[current]}</div>
    <textarea id="answer" placeholder="Escribe tu respuesta..."></textarea>
    <button id="nextBtn" class="btn">Siguiente</button>
  \`;
  document.getElementById('nextBtn').onclick = ()=>{
    const val = document.getElementById('answer').value.trim();
    if(!val) return alert("Debes responder");
    respuestas.push(val);
    current++;
    if(current < preguntas.length) showQuestion();
    else submitWL();
  };
}

async function submitWL(){
  clearInterval(timerInterval);
  container.innerHTML="<h2>Enviando WL...</h2>";
  const res = await fetch('/wl-form',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({discordId,respuestas})
  });
  const data = await res.json();
  container.innerHTML = "<h2>"+(data.ok?"✅ WL enviada con éxito!":"❌ Error")+" </h2>";
}
</script>
</body>
</html>
    `);

  }catch(err){
    console.error(err);
    res.send("❌ Error interno: "+err.message);
  }
});

// --- WL form endpoint ---
app.post('/wl-form', async (req,res)=>{
  try{
    const { discordId,respuestas } = req.body;
    if(!discordId || !respuestas) return res.status(400).json({error:'Faltan datos'});
    if(sentUsers.has(discordId)) return res.status(400).json({error:'Ya enviaste'});

    sentUsers.add(discordId);

    const wlChannel = await client.channels.fetch(WL_CHANNEL_ID);
    const resultChannel = await client.channels.fetch(RESULT_CHANNEL_ID);

    await wlChannel.send(`<@${discordId}> envió su WL:`);

    const embed = new EmbedBuilder()
      .setTitle('📄 Nueva WL enviada')
      .setDescription(respuestas.map((r,i)=>`**Pregunta ${i+1}:** ${r}`).join('\n\n'))
      .setColor('#FFD700');

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId(`accept_${discordId}`).setLabel('✅ Aceptar').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`reject_${discordId}`).setLabel('❌ Rechazar').setStyle(ButtonStyle.Danger)
      );

    await wlChannel.send({embeds:[embed],components:[row]});
    await resultChannel.send({embeds:[embed],components:[row]});

    res.json({ok:true});
  }catch(err){
    console.error(err);
    res.status(500).json({error:'Error interno'});
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

  const embed = new EmbedBuilder()
    .setTitle(action==='accept'?'✅ WL Aceptada':'❌ WL Rechazada')
    .setDescription(`<@${discordId}> ${action==='accept'?'fue aceptado':'fue rechazado'} a La Piña RP!`)
    .setColor(action==='accept'?'#00FF00':'#FF0000')
    .setImage(
      action==='accept'
      ? 'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExZnh3N3duYXA4OW0wMG1samVyZTUxdzk1ZWF2MGh6dHhrYWJ5MzBsMSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/sOzVzt9IWu2ECjLVfF/giphy.gif'
      : 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2VveW9waW94OGFicmcyeGZzZDZ1cG4zb3Y5eXh2OTFyMTE3OGZuNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/bGtF6Y5QRjmvjqamoL/giphy.gif'
    );

  await member.send({embeds:[embed]}).catch(()=>null);
  await resultChannel.send({embeds:[embed]});
  await interaction.update({content: action==='accept'?'✅ WL aceptada':'❌ WL rechazada',components:[],embeds:interaction.message.embeds});
});

// --- Start ---
client.login(TOKEN);
app.listen(PORT,()=>console.log(`Servidor corriendo en puerto ${PORT}`));

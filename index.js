import express from 'express';
import fetch from 'node-fetch';
import cookieParser from 'cookie-parser';
import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events } from 'discord.js';

const {
  DISCORD_TOKEN, CLIENT_ID, CLIENT_SECRET,
  GUILD_ID, WL_CHANNEL_ID, RESULT_CHANNEL_ID,
  PORT = 3000
} = process.env;

// Roles
const ROLE_ACCEPTED = 'ROLE_ACCEPTED_ID';
const ROLE_REJECTED = 'ROLE_REJECTED_ID';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages] });
const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

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
  "¿Está permitido hablar de temas de la vida real (fútbol, política, clima real) por el chat de voz del juego?",
  "¿Qué es el RDM (Random Deathmatch)?",
  "¿Qué significa 'Valorar la vida'?"
];

// Usuarios que ya enviaron WL
const wlUsers = new Map();

// --- Página de inicio ---
app.get('/', (req,res)=>{
  const oauthLink = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=https%3A%2F%2Fwl-discord.onrender.com%2Fcallback&scope=identify+guilds+email+openid`;
  res.send(`
    <html>
    <head>
      <title>La Piña RP - WL</title>
      <link rel="stylesheet" href="/style.css">
    </head>
    <body>
      <div class="card gradient-border">
        <img src="/logo.png" id="logo" />
        <h1>La Piña RP - Whitelist</h1>
        <p>Lee cuidadosamente las instrucciones antes de comenzar tu WL.</p>
        <a href="${oauthLink}"><button class="btn">Conectar con Discord y Comenzar</button></a>
      </div>
    </body>
    </html>
  `);
});

// --- Callback OAuth2 ---
app.get('/callback', async (req,res)=>{
  try{
    const code = req.query.code;
    if(!code) return res.send("Error: No se recibió código OAuth2");

    const params = new URLSearchParams();
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('grant_type','authorization_code');
    params.append('code', code);
    params.append('redirect_uri','https://wl-discord.onrender.com/callback');

    const tokenRes = await fetch('https://discord.com/api/oauth2/token',{
      method:'POST', body:params, headers:{'Content-Type':'application/x-www-form-urlencoded'}
    });
    const tokenData = await tokenRes.json();
    if(tokenData.error) return res.send(`Error OAuth2: ${tokenData.error_description}`);

    const userRes = await fetch('https://discord.com/api/users/@me',{
      headers:{Authorization:`Bearer ${tokenData.access_token}`}
    });
    const userData = await userRes.json();
    const discordId = userData.id;
    const username = userData.username;

    if(wlUsers.has(discordId)) return res.send("<h2>Ya enviaste tu WL o tu resultado ya está definido</h2>");

    res.send(`
      <html>
      <head>
        <title>La Piña RP - Instrucciones</title>
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
        <div class="card gradient-border">
          <img src="/logo.png" id="logo"/>
          <h1>Whitelist - ${username}</h1>
          <p>Solo puedes enviar tu WL una vez. Presiona "Comenzar" para iniciar.</p>
          <button id="startBtn" class="btn">Comenzar</button>
          <div id="formContainer"></div>
        </div>

        <script>
          const preguntas = ${JSON.stringify(preguntas)};
          let current=0, respuestas=[];
          const discordId="${discordId}";
          const container = document.getElementById('formContainer');
          const startBtn = document.getElementById('startBtn');

          startBtn.onclick = ()=>{ showQuestion(); startBtn.style.display='none'; };

          function showQuestion(){
            if(current>=preguntas.length){ submitWL(); return; }
            container.innerHTML = \`
              <p>\${preguntas[current]}</p>
              <input type="text" id="answer" />
              <button onclick="nextQuestion()">Listo</button>
              <div class="progress-bar"><div class="progress-fill" style="width:\${Math.floor(current/preguntas.length*100)}%"></div></div>
            \`;
          }

          function nextQuestion(){
            const val=document.getElementById('answer').value.trim();
            if(!val){ alert("Debes responder"); return; }
            respuestas.push(val); current++; showQuestion();
          }

          async function submitWL(){
            container.innerHTML="<p>Enviando WL...</p>";
            const res = await fetch('/wl-form',{
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body:JSON.stringify({discordId,respuestas})
            });
            const data = await res.json();
            if(data.status==='ok'){
              container.innerHTML="<h2>✅ WL enviada con éxito!</h2>";
            }else{
              container.innerHTML="<h2>❌ Error al enviar WL</h2>";
            }
          }
        </script>
      </body>
      </html>
    `);

  }catch(err){
    console.error(err);
    res.send("❌ Error interno");
  }
});

// --- Endpoint WL ---
app.post('/wl-form', async (req,res)=>{
  try{
    const {discordId,respuestas} = req.body;
    if(!discordId || !respuestas) return res.status(400).json({error:'Faltan datos'});
    if(wlUsers.has(discordId)) return res.json({status:'ok'}); 

    wlUsers.set(discordId, {respuestas, status:null}); 

    const wlChannel = await client.channels.fetch(WL_CHANNEL_ID);
    await wlChannel.send(`<@${discordId}> envió su WL:`);

    const embed = new EmbedBuilder()
      .setTitle('📄 Nueva WL enviada')
      .setDescription(respuestas.map((r,i)=>`\n**Pregunta ${i+1}:** ${r}`).join(''))
      .setColor('#FFD700')
      .setThumbnail('https://i.imgur.com/tuLogo.png');

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId(`accept_${discordId}`).setLabel('✅ Aceptar').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`reject_${discordId}`).setLabel('❌ Rechazar').setStyle(ButtonStyle.Danger)
      );

    await wlChannel.send({embeds:[embed], components:[row]});

    res.json({status:'ok'});

  }catch(err){
    console.error(err);
    res.status(500).json({error:'Error interno'});
  }
});

// --- Bot Discord ---
client.on(Events.InteractionCreate, async interaction=>{
  if(!interaction.isButton()) return;
  const [action, discordId] = interaction.customId.split('_');
  const guild = await client.guilds.fetch(GUILD_ID);
  const member = await guild.members.fetch(discordId).catch(()=>null);
  if(!member) return;
  const resultChannel = await client.channels.fetch(RESULT_CHANNEL_ID);

  let embed = new EmbedBuilder()
    .setTitle(action==='accept'?'✅ WL Aceptada':'❌ WL Rechazada')
    .setDescription(`<@${discordId}> ${action==='accept'?'fue aceptado':'fue rechazado'} a La Piña RP!`)
    .setColor(action==='accept'?'#00FF00':'#FF0000');

  await member.send({embeds:[embed]}).catch(()=>null);
  await resultChannel.send({embeds:[embed]});
  await interaction.update({content: action==='accept'?'✅ WL aceptada':'❌ WL rechazada', components:[], embeds:interaction.message.embeds });

  wlUsers.set(discordId,{...wlUsers.get(discordId), status:action}); // Guardar resultado
});

client.on('ready', ()=>console.log(`Bot listo! ${client.user.tag}`));
client.login(DISCORD_TOKEN);

// --- Servidor ---
app.listen(PORT, ()=>console.log(`Servidor corriendo en puerto ${PORT}`));

import express from 'express';
import fetch from 'node-fetch';
import cookieParser from 'cookie-parser';
import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events } from 'discord.js';

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
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public')); // Aquí va logo.png

// --- Preguntas WL ---
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
  "¿Está permitido hablar de temas de la vida real por el chat de voz del juego?",
  "¿Qué es el RDM (Random Deathmatch)?",
  "¿Qué significa 'Valorar la vida'?"
];

// --- Inicio con instrucciones ---
app.get('/', (req,res)=>{
  const oauthLink = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=https%3A%2F%2Fwl-discord.onrender.com%2Fcallback&scope=identify+guilds+email+openid`;
  res.send(`
  <html>
  <head>
    <title>WL Piña RP</title>
    <style>
      body { background:#000; color:#fff; font-family:Arial; text-align:center; margin:0; display:flex; justify-content:center; align-items:center; height:100vh; }
      .card { background:#111; border:4px solid; border-image: linear-gradient(45deg,#FFD700,#FFAA00) 1; border-radius:15px; padding:40px; max-width:600px; text-align:center; }
      h1 { color:#FFD700; font-size:48px; margin-bottom:20px; }
      p { font-size:20px; margin:10px 0; }
      button { padding:15px 30px; background:#FFD700; color:#000; border:none; border-radius:10px; cursor:pointer; font-size:22px; margin-top:20px; }
      button:hover { background:#e6c200; }
      #logo { width:200px; display:block; margin:0 auto 20px auto; }
      #footer { margin-top:30px; font-size:14px; color:#888; }
    </style>
  </head>
  <body>
    <div class="card">
      <img id="logo" src="/logo.png"/>
      <h1>Piña RP - WL Discord</h1>
      <p>Lee cuidadosamente las instrucciones antes de comenzar tu WL.</p>
      <p>Tendrás máximo 3 oportunidades. Si cambias de pestaña o refrescas, se cancela el intento.</p>
      <a href="${oauthLink}"><button>Conectar con Discord y Comenzar</button></a>
      <div id="footer">© 2025 La Piña RP</div>
    </div>
  </body>
  </html>
  `);
});

// --- Callback OAuth2 ---
app.get('/callback', async (req,res)=>{
  try {
    const code = req.query.code;
    if(!code) return res.send("No se recibió código OAuth2");

    const params = new URLSearchParams();
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('grant_type','authorization_code');
    params.append('code', code);
    params.append('redirect_uri','https://wl-discord.onrender.com/callback');

    const tokenRes = await fetch('https://discord.com/api/oauth2/token',{
      method:'POST',
      body: params,
      headers:{ 'Content-Type':'application/x-www-form-urlencoded' }
    });
    const tokenData = await tokenRes.json();
    if(tokenData.error) return res.send(`Error OAuth2: ${tokenData.error_description}`);

    const userRes = await fetch('https://discord.com/api/users/@me',{
      headers:{ Authorization: `Bearer ${tokenData.access_token}` }
    });
    const userData = await userRes.json();
    const discordId = userData.id;
    const username = userData.username;

    res.cookie('discordId', discordId, { maxAge: 15*60*1000 });
    res.redirect(`/form`);
  } catch(err){ console.error(err); res.send("❌ Error interno"); }
});

// --- Formulario paso a paso ---
app.get('/form', (req,res)=>{
  const discordId = req.cookies.discordId;
  if(!discordId) return res.redirect('/');

  res.send(`
  <html>
  <head>
    <title>WL Piña RP - Formulario</title>
    <style>
      body { background:#000; color:#fff; font-family:Arial; text-align:center; margin:0; display:flex; justify-content:center; align-items:center; height:100vh; }
      .card { background:#111; border:4px solid; border-image: linear-gradient(45deg,#FFD700,#FFAA00) 1; border-radius:15px; padding:30px; max-width:600px; width:90%; text-align:center; }
      h1 { color:#FFD700; font-size:36px; margin-bottom:15px; }
      #logo { width:150px; display:block; margin:0 auto 15px auto; }
      #instructions { font-size:18px; margin-bottom:20px; }
      #question { font-size:20px; margin-top:20px; }
      input { width:80%; padding:10px; margin-top:10px; border-radius:6px; border:none; font-size:18px; }
      button { padding:12px 25px; background:#FFD700; color:#000; border:none; border-radius:6px; cursor:pointer; font-size:18px; margin-top:20px; }
      button:hover { background:#e6c200; }
      #timer { font-size:20px; margin-top:15px; color:#FFD700; }
      #progress-bar { width:100%; background:#333; border-radius:10px; margin-top:15px; height:20px; overflow:hidden; }
      #progress { height:100%; width:0%; background:linear-gradient(90deg,#FFD700,#FFAA00); transition:width 0.3s;}
      #footer { margin-top:20px; font-size:14px; color:#888; }
    </style>
  </head>
  <body>
    <div class="card">
      <img id="logo" src="/logo.png"/>
      <h1>WL Formulario - ${discordId}</h1>
      <div id="instructions">Presiona "Comenzar" para iniciar. Máximo 3 intentos. Cambiar de pestaña o refrescar cancela el intento.</div>
      <div id="timer">Tiempo restante: 15:00</div>
      <div id="progress-bar"><div id="progress"></div></div>
      <div id="form-container">
        <button id="startBtn">Comenzar</button>
      </div>
      <div id="footer">© 2025 La Piña RP</div>
    </div>

    <script>
      const preguntas = ${JSON.stringify(preguntas)};
      const discordId = "${discordId}";
      let current = 0;
      const respuestas = [];
      let tiempo = 900; // 15 min
      let intentos = 0;
      const maxIntentos = 3;
      let timerInterval;

      const container = document.getElementById('form-container');
      const startBtn = document.getElementById('startBtn');
      const timerEl = document.getElementById('timer');
      const progressEl = document.getElementById('progress');

      function resetForm(){
        current = 0;
        respuestas.length = 0;
        progressEl.style.width = "0%";
      }

      function startTimer(){
        timerInterval = setInterval(()=>{
          if(tiempo<=0){ clearInterval(timerInterval); cancelAttempt(); return; }
          let min = Math.floor(tiempo/60);
          let sec = tiempo%60;
          timerEl.innerText = "Tiempo restante: "+min.toString().padStart(2,'0')+":"+sec.toString().padStart(2,'0');
          tiempo--;
        },1000);
      }

      function cancelAttempt(){
        intentos++;
        alert("⏰ WL cancelada por cambio de pestaña o tiempo. Intentos restantes: "+(maxIntentos-intentos));
        container.innerHTML = '<p>Intenta nuevamente más tarde.</p>';
      }

      window.onblur = cancelAttempt;

      startBtn.onclick = ()=>{
        if(intentos>=maxIntentos){ alert("Ya agotaste tus 3 intentos"); return; }
        resetForm();
        showQuestion();
        startTimer();
      };

      function showQuestion(){
        container.innerHTML = \`
          <div id="question">\${preguntas[current]}</div>
          <input type="text" id="answer"/>
          <br/>
          <button id="nextBtn">Listo</button>
        \`;
        document.getElementById('nextBtn').onclick = ()=>{
          const val = document.getElementById('answer').value.trim();
          if(!val){ alert("Debes responder"); return; }
          respuestas.push(val);
          current++;
          progressEl.style.width = ((current/preguntas.length)*100)+"%";
          if(current < preguntas.length) showQuestion();
          else submitWL();
        };
      }

      async function submitWL(){
        clearInterval(timerInterval);
        container.innerHTML = "<p>Enviando WL...</p>";
        const res = await fetch('/wl-form',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({discordId,respuestas})
        });
        const data = await res.json();
        container.innerHTML = "<p>" + (data.status==='ok'?'✅ WL enviada con éxito!':'❌ Error al enviar') + "</p>";
      }
    </script>
  </body>
  </html>
  `);
});

// --- Endpoint WL-form ---
app.post('/wl-form', async (req,res)=>{
  try {
    const { discordId,respuestas } = req.body;
    if(!discordId || !respuestas) return res.status(400).json({ error:'Faltan datos' });

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

    await wlChannel.send({ embeds:[embed], components:[row] });
    res.json({ status:'ok' });

  } catch(err){ console.error(err); res.status(500).json({ error:'Error interno' }); }
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
    .setColor(action==='accept'?'#00FF00':'#FF0000');

  const gif = action==='accept'
    ? 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMGowbHhkaXJyeXcwanFjenNnbTV4ZTZhaGViMjN1cXIyODk2emcwNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/RGxQHSsRUP753rvYHs/giphy.gif'
    : 'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNGxiZzhnaXU1czFqMWVjNjNxNzVnMnB0N2VpdTdmNndlbHh6d2U1eiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/2iD1cNf6tslgWDLn6n/giphy.gif';

  await member.send({ content: gif, embeds:[embed] }).catch(()=>null);
  await resultChannel.send({ content: `<@${discordId}>`, embeds:[embed] });

  await interaction.update({ content: action==='accept'?'✅ WL aceptada':'❌ WL rechazada', components:[], embeds:interaction.message.embeds });
});

client.on('ready', ()=>console.log(`Bot listo! ${client.user.tag}`));
client.login(TOKEN);

app.listen(PORT, ()=>console.log(`Servidor corriendo en puerto ${PORT}`));

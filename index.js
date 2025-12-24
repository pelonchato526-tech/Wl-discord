require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events
} = require('discord.js');

/* ================== DISCORD BOT ================== */
const client = new Client({
  intents: [GatewayIntentBits.Guilds] // SOLO GUILDS (evita errores)
});

client.login(process.env.DISCORD_TOKEN);

client.once('ready', () => {
  console.log(`🤖 Bot listo: ${client.user.tag}`);
});

/* ================== EXPRESS ================== */
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ================== HOME ================== */
app.get('/', (req, res) => {
  const oauth = 'https://discord.com/oauth2/authorize?client_id=1453271207490355284&response_type=code&redirect_uri=https%3A%2F%2Fwl-discord.onrender.com%2Fcallback&scope=identify';

  res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Piña RP | Whitelist</title>
<style>
body{margin:0;background:#0b0e16;color:#fff;font-family:Arial}
.container{display:flex;flex-direction:column;align-items:center;padding-top:40px}
.logo{width:120px;margin-bottom:20px}
.card{background:#111827;padding:25px;border-radius:16px;width:90%;max-width:420px;box-shadow:0 0 25px rgba(245,158,11,.25)}
h1{text-align:center;color:#f59e0b}
button{width:100%;padding:12px;background:#f59e0b;border:none;border-radius:10px;font-weight:bold;font-size:16px}
</style>
</head>
<body>
<div class="container">
  <img src="/logo.png" class="logo">
  <div class="card">
    <h1>Whitelist Piña RP</h1>
    <a href="${oauth}">
      <button>Continuar con Discord</button>
    </a>
  </div>
</div>
</body>
</html>
`);
});

/* ================== CALLBACK ================== */
app.get('/callback', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.send('Error OAuth');

    const tokenData = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'https://wl-discord.onrender.com/callback'
      })
    }).then(r => r.json());

    const user = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    }).then(r => r.json());

    res.send(renderForm(user.id));
  } catch (e) {
    console.error(e);
    res.send('Error interno');
  }
});

/* ================== FORM HTML ================== */
function renderForm(userId) {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Formulario WL</title>
<style>
body{background:#0b0e16;color:#fff;font-family:Arial}
.container{max-width:420px;margin:30px auto}
.logo{width:110px;display:block;margin:0 auto 15px}
.card{background:#111827;padding:20px;border-radius:16px}
h2{text-align:center;color:#f59e0b}
textarea{width:100%;margin-top:8px;padding:8px;border-radius:8px;border:none;background:#0b0e16;color:#fff}
button{margin-top:12px;width:100%;padding:12px;background:#f59e0b;border:none;border-radius:10px;font-weight:bold}
.timer{text-align:center;margin:10px 0;color:#f59e0b}
</style>
</head>
<body>
<div class="container">
<img src="/logo.png" class="logo">
<div class="card">
<h2>Formulario WL</h2>
<div class="timer" id="timer">⏱️ 20:00</div>

<form method="POST" action="/send">
<input type="hidden" name="id" value="${userId}">
<textarea name="q1" required placeholder="1. ¿Qué significa Roleplay (RP)?"></textarea>
<textarea name="q2" required placeholder="2. ¿Qué es MetaGaming (MG)?"></textarea>
<textarea name="q3" required placeholder="3. ¿Qué es PowerGaming (PG)?"></textarea>
<textarea name="q4" required placeholder="4. ¿Qué es Fail RP?"></textarea>
<textarea name="q5" required placeholder="5. ¿Qué es PK?"></textarea>
<textarea name="q6" required placeholder="6. ¿Qué es CK?"></textarea>
<textarea name="q7" required placeholder="7. ¿Qué es NRP?"></textarea>
<textarea name="q8" required placeholder="8. Policía te apunta, ¿qué haces?"></textarea>
<textarea name="q9" required placeholder="9. Estás inconsciente, ¿qué no puedes hacer?"></textarea>
<textarea name="q10" required placeholder="10. Te chocan y huyen, ¿qué haces?"></textarea>
<textarea name="q11" required placeholder="11. ¿Se puede usar info de Discord?"></textarea>
<textarea name="q12" required placeholder="12. ¿Por qué quieres entrar a Piña RP?"></textarea>
<button>Enviar WL</button>
</form>
</div>
</div>

<script>
let time = 1200;
const t = document.getElementById('timer');
setInterval(()=>{
  time--;
  const m = Math.floor(time/60);
  const s = time%60;
  t.innerText = '⏱️ ' + m + ':' + s.toString().padStart(2,'0');
  if(time<=0){ alert('Tiempo agotado'); location.reload(); }
},1000);
</script>

</body>
</html>
`;
}

/* ================== ENVIAR WL ================== */
app.post('/send', async (req, res) => {
  try {
    const channel = await client.channels.fetch(process.env.WL_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setTitle('📄 Nueva Whitelist')
      .setColor('#f59e0b')
      .setDescription(
        Object.entries(req.body)
          .filter(([k]) => k !== 'id')
          .map(([k,v],i)=>`**${i+1}.** ${v}`)
          .join('\n\n')
      )
      .setFooter({ text: `Usuario ID: ${req.body.id}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`accept_${req.body.id}`)
        .setLabel('Aceptar')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`reject_${req.body.id}`)
        .setLabel('Rechazar')
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({ embeds: [embed], components: [row] });
    res.send('WL enviada correctamente. Puedes cerrar esta página.');
  } catch (e) {
    console.error(e);
    res.send('Error al enviar WL');
  }
});

/* ================== BOTONES ================== */
client.on(Events.InteractionCreate, async i => {
  if (!i.isButton()) return;

  const [action, id] = i.customId.split('_');
  const result = await client.channels.fetch(process.env.RESULT_CHANNEL_ID);

  await result.send(`<@${id}> fue ${action === 'accept' ? '✅ ACEPTADO' : '❌ RECHAZADO'}`);
  await i.update({ components: [] });
});

/* ================== SERVER ================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Web en puerto ${PORT}`));
